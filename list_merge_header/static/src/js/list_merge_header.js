/** @odoo-module **/
import { onMounted, onPatched, onWillUnmount } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { ListArchParser } from "@web/views/list/list_arch_parser";
import { ListRenderer } from "@web/views/list/list_renderer";

patch(ListArchParser.prototype, {
    parse(xmlDoc, ...args) {
        const previous = this.mergeNodes;
        this.mergeNodes = new WeakMap();
        [...xmlDoc.children].filter(node => node.tagName === "merge").forEach((node, index) => {
            this.mergeNodes.set(node, {id: "merge_" + index, label: node.getAttribute("string") || ""});
        });
        try { return super.parse(xmlDoc, ...args); }
        finally { this.mergeNodes = previous; }
    },
    parseFieldNode(node, ...args) {
        const column = super.parseFieldNode(node, ...args);
        const mergeGroup = this.mergeNodes?.get(node.parentElement);
        if (mergeGroup) column.mergeGroup = mergeGroup;
        return column;
    },
});
patch(ListRenderer.prototype, {
    setup() {
        super.setup(...arguments);
        let observer;
        const sync = () => {
            const table = this.tableRef();
            const cols = table?.querySelectorAll("colgroup.o_merge_column_widths col");
            if (!cols?.length) return;
            // Core computes widths from the original leaf headers only. Transfer those
            // widths to col elements so the extra colspan row cannot override fixed layout.
            const headers = table.querySelectorAll("thead th");
            headers.forEach((header, index) => {
                if (cols[index]) cols[index].style.width = header.style.width;
            });
        };
        onMounted(() => {
            sync();
            if (!this.props.archInfo.columns.some(column => column.mergeGroup)) return;
            observer = new MutationObserver(sync);
            observer.observe(this.tableRef().querySelector("thead"), {
                subtree:true, childList:true, attributes:true, attributeFilter:["style"],
            });
        });
        onPatched(sync);
        onWillUnmount(() => observer?.disconnect());
    },
    get hasMergeHeaders() { return this.columns.some(column => column.mergeGroup); },
    get mergeWidthColumns() { return Array.from({length:this.nbCols}, (_, index) => index); },
    getMergeGroups() {
        const groups = [];
        for (const column of this.columns) {
            const last = groups.at(-1);
            if (column.mergeGroup && last?.mergeId === column.mergeGroup.id) last.span++;
            else groups.push({id:column.id, mergeId:column.mergeGroup?.id, label:column.mergeGroup?.label || "", span:1});
        }
        return groups;
    },
});
