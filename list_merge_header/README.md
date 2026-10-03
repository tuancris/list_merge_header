# List Merge Header

This Odoo 20 module allows you to group multiple columns under a shared label using the `<merge>` XML tag in list/tree views, similar to merged cells in Excel.

## Features
- Easily group columns in list views.
- Supports translating the group label via the `string` attribute.
- Fully compatible with Odoo 20's Owl architecture.

## Usage
In your list/tree view XML, wrap the fields you want to group inside a `<merge>` tag and provide a `string` attribute for the group label:

```xml
<list>
    <field name="code"/>
    <field name="name"/>
    <merge string="Q3 Metrics">
        <field name="qty_july" sum="July"/>
        <field name="qty_august" sum="August"/>
        <field name="qty_september" sum="September"/>
    </merge>
</list>
```

## Technical Notes
- The module overrides the core `ListArchParser` to detect the `<merge>` tag.
- The `ListRenderer` template is extended to render a two-row `<thead>` when merge groups are present.
- The server-side XML validator is patched to accept the `<merge>` tag without raising errors.

## Author
Tuan Nguyen Van

## Odoo 20 compatibility
- Merge nodes must be direct children of a list, with a non-empty string and one or more field children.
- Optional fields and column_invisible update visible group spans automatically.
- Native Odoo 20 column nodes remain supported outside merge groups.
- Sorting, selection, resize and the optional columns menu use the original Odoo header row.
