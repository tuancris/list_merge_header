/** @odoo-module **/
// Part of list_merge_header. See LICENSE file for full copyright and licensing details.

import { patch } from "@web/core/utils/patch";
import { ListArchParser } from "@web/views/list/list_arch_parser";
import { ListRenderer } from "@web/views/list/list_renderer";

// ─────────────────────────────────────────────────────────────────────
// 1.  Patch ListArchParser – detect <merge> tags & annotate columns
// ─────────────────────────────────────────────────────────────────────

patch(ListArchParser.prototype, {
    /**
     * Override: scan for ``<merge string="…">`` wrapper nodes before
     * delegating to the original parser.  ``visitXML`` in the original
     * ``parse`` already walks into ``<merge>`` children (``<field>``
     * nodes) automatically because the callback does not return ``false``
     * for unknown tags.  After the original parse completes we simply
     * annotate each column that belongs to a merge group.
     */
    parse(xmlDoc, models, modelName) {
        // ── Step 1 – Pre-scan for merge groups ──────────────────────
        const mergeInfo = {};          // fieldName → { id, label }
        let mergeGroupId = 0;

        for (const mergeNode of xmlDoc.querySelectorAll("merge")) {
            const groupId = `merge_${mergeGroupId++}`;
            // string attr is already translated by the server before
            // the arch reaches the client, so no _t() needed.
            const label = mergeNode.getAttribute("string") || "";
            for (const child of mergeNode.children) {
                if (child.tagName === "field") {
                    mergeInfo[child.getAttribute("name")] = {
                        id: groupId,
                        label,
                    };
                }
            }
        }

        // ── Step 2 – Delegate to original parser ────────────────────
        const result = super.parse(xmlDoc, models, modelName);

        // ── Step 3 – Annotate columns with merge metadata ───────────
        for (const col of result.columns) {
            if (col.type === "field" && col.name in mergeInfo) {
                col.mergeGroup = mergeInfo[col.name];
            }
        }
        result.hasMergeHeaders = Object.keys(mergeInfo).length > 0;

        return result;
    },
});

// ─────────────────────────────────────────────────────────────────────
// 2.  Patch ListRenderer – helpers consumed by the OWL template
// ─────────────────────────────────────────────────────────────────────

patch(ListRenderer.prototype, {
    /**
     * ``true`` when at least one **visible** column belongs to a merge
     * group.  Drives the ``t-if="hasMergeHeaders"`` branch in the
     * template.
     */
    get hasMergeHeaders() {
        return this.columns.some((col) => col.mergeGroup);
    },

    /**
     * Build the first-row header structure for merge mode.
     *
     * Each entry is either:
     *   • A **standalone** (non-merged) column → ``{ isMerge: false,
     *     column, rowspan: 2 }``
     *   • A **merge group** → ``{ isMerge: true, id, label,
     *     span: <colspan> }``
     *
     * Adjacent columns sharing the same ``mergeGroup.id`` are collapsed
     * into a single entry.
     *
     * @returns {Array}
     */
    getMergeGroups() {
        if (!this.hasMergeHeaders) {
            return [];
        }
        const groups = [];
        let current = null;

        for (const col of this.columns) {
            if (col.mergeGroup) {
                if (current && current.id === col.mergeGroup.id) {
                    current.span++;
                } else {
                    current = {
                        id: col.mergeGroup.id,
                        label: col.mergeGroup.label,
                        span: 1,
                        isMerge: true,
                    };
                    groups.push(current);
                }
            } else {
                current = null;
                groups.push({
                    id: col.id,
                    span: 1,
                    rowspan: 2,
                    isMerge: false,
                    column: col,
                });
            }
        }
        return groups;
    },

    /**
     * Return only the columns that sit inside a ``<merge>`` group.
     * Used by the template to render the **second** header row.
     */
    get mergeSubColumns() {
        if (!this.hasMergeHeaders) {
            return [];
        }
        return this.columns.filter((col) => col.mergeGroup);
    },
});
