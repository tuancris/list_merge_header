# Part of list_merge_header. See LICENSE file for full copyright and licensing details.

import logging
from lxml import etree
from odoo import models
from odoo.tools.view_validation import _validators

_logger = logging.getLogger(__name__)

# --- Patch RNG validation to allow <merge> tag ---
for i, validator in enumerate(_validators.get('list', [])):
    if validator.__name__ == 'schema_valid':
        _original_schema_valid = validator
        def my_schema_valid(arch, **kwargs):
            if arch.tag == 'list' and arch.xpath('.//merge'):
                import copy
                arch_copy = copy.deepcopy(arch)
                for merge_node in arch_copy.xpath('.//merge'):
                    parent = merge_node.getparent()
                    index = parent.index(merge_node)
                    for child in reversed(merge_node):
                        parent.insert(index, child)
                    parent.remove(merge_node)
                return _original_schema_valid(arch_copy, **kwargs)
            return _original_schema_valid(arch, **kwargs)
        _validators['list'][i] = my_schema_valid
        break


class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    def _validate_tag_merge(self, node, name_manager, node_info):
        """Allow ``<merge>`` tag inside list views.

        The child ``<field>`` nodes are validated automatically by the parent
        :meth:`~_validate_view` loop, so this handler is intentionally empty.
        """
        pass

    def _validate_tag_list(self, node, name_manager, node_info):
        """Override _validate_tag_list to add 'merge' to allowed tags cleanly."""
        # Gọi validate form view giống như Odoo core
        self._validate_tag_form(node, name_manager, node_info)
        if not node_info['validate']:
            return

        # Validate editable attribute
        editable_attr = node.get("editable")
        if editable_attr and editable_attr not in ["top", "bottom"]:
            msg = self.env._(
                'The "editable" attribute of list views must be "top" or "bottom", received %(value)s',
                value=editable_attr,
            )
            self._raise_view_error(msg, node)

        # Định nghĩa các thẻ hợp lệ, thêm 'merge' vào danh sách gốc của Odoo
        allowed_tags = ('field', 'button', 'control', 'groupby', 'widget', 'header', 'merge')
        
        from lxml import etree
        for child in node.iterchildren(tag=etree.Element):
            if child.tag not in allowed_tags and not isinstance(child, etree._Comment):
                msg = self.env._(
                    'List child can only have one of %(tags)s tag (not %(wrong_tag)s)',
                    tags=', '.join(allowed_tags), wrong_tag=child.tag,
                )
                self._raise_view_error(msg, child)

