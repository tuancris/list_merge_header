# Part of list_merge_header. See LICENSE file for full copyright and licensing details.
from copy import deepcopy
from lxml import etree
from odoo import models
from odoo.tools import view_validation


def flatten_merge(arch):
    result = deepcopy(arch)
    for node in result.xpath("./merge | .//list/merge"):
        parent = node.getparent()
        index = parent.index(node)
        for child in list(node):
            parent.insert(index, child)
            index += 1
        parent.remove(node)
    return result


def merge_schema_validator(original):
    def schema_valid(arch, **kwargs):
        return original(flatten_merge(arch), **kwargs)
    schema_valid._list_merge_header = True
    return schema_valid


for index, validator in enumerate(view_validation._validators['list']):
    if getattr(validator, '_list_merge_header', False):
        break
    if validator.__name__ == 'schema_valid':
        view_validation._validators['list'][index] = merge_schema_validator(validator)
        break


class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    def _validate_tag_list(self, node, name_manager, node_info):
        # Keep all current core list rules, including Odoo 20's native <column>.
        return super()._validate_tag_list(flatten_merge(node), name_manager, node_info)

    def _validate_tag_merge(self, node, name_manager, node_info):
        if not node_info['validate']:
            return
        if node.getparent().tag != 'list':
            self._raise_view_error('A merge group must be a direct child of a list.', node)
        if not (node.get('string') or '').strip():
            self._raise_view_error('A merge group requires a non-empty string label.', node)
        if set(node.attrib) - {'string', 'groups'}:
            self._raise_view_error('Merge groups only support string and groups attributes.', node)
        children = list(node.iterchildren(tag=etree.Element))
        if not children or any(child.tag != 'field' for child in children):
            self._raise_view_error('A merge group must contain one or more field nodes only.', node)
