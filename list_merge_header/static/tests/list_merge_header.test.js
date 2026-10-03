import { describe, expect, test } from "@odoo/hoot";
import { queryOne, queryAll, queryAllTexts } from "@odoo/hoot-dom";
import { animationFrame } from "@odoo/hoot-mock";
import { contains, defineModels, fields, models, mountView, webModels } from "@web/../tests/web_test_helpers";
import "@list_merge_header/js/list_merge_header";
describe.current.tags("desktop");
class MergeDemo extends models.Model {
    _name = "merge.demo";
    name = fields.Char(); amount = fields.Integer(); rate = fields.Float(); category = fields.Char();
    lines = fields.One2many({relation:"merge.demo"});
    _records = [{id:1,name:"B",amount:20,rate:2,category:"X",lines:[2]}, {id:2,name:"A",amount:10,rate:1,category:"Y",lines:[]}];
}
defineModels([MergeDemo, ...Object.values(webModels)]);
const grouped = '<list><field name="name"/><merge string="Metrics"><field name="amount" sum="Total"/><field name="rate"/></merge></list>';
async function mount(arch=grouped, extra={}) { return mountView({type:"list",resModel:"merge.demo",arch,...extra}); }

test("plain lists keep native headers",async()=>{
    await mount('<list><field name="name"/><field name="amount"/></list>');
    expect("thead tr").toHaveCount(1); expect("colgroup.o_merge_column_widths").toHaveCount(0);
    expect("thead th[data-name]").toHaveCount(2);
});
test("merged labels span their visible leaf columns",async()=>{
    await mount(); expect("thead tr").toHaveCount(2);
    expect(".o_merge_group_header").toHaveText("Metrics");
    expect(queryOne(".o_merge_group_header").colSpan).toBe(2);
    expect("thead th[data-name]").toHaveCount(3);
    expect(".o_data_row:first td[name=amount]").toHaveText("20");
    expect(".o_list_footer").toHaveText(/30/);
});
test("duplicate fields outside a merge retain their own metadata",async()=>{
    await mount('<list><field name="amount"/><merge string="Metrics"><field name="amount"/><field name="rate"/></merge></list>');
    expect(queryOne(".o_merge_group_header").colSpan).toBe(2);
    expect(queryAll(".o_merge_header_top td")[1].getAttribute("role")).toBe(null);
});
test("duplicate fields can belong to distinct merge groups",async()=>{
    await mount('<list><merge string="First"><field name="amount"/></merge><merge string="Second"><field name="amount"/></merge></list>');
    expect(queryAllTexts(".o_merge_group_header")).toEqual(["First","Second"]);
    expect(queryAll(".o_merge_group_header").map(cell=>cell.colSpan)).toEqual([1,1]);
});
test("column_invisible excludes hidden columns from spans",async()=>{
    await mount('<list><merge string="Metrics"><field name="amount"/><field name="rate" column_invisible="True"/></merge><field name="name"/></list>');
    expect(queryOne(".o_merge_group_header").colSpan).toBe(1); expect('th[data-name=rate]').toHaveCount(0);
});
test("fully hidden merge groups do not add a header row",async()=>{
    await mount('<list><merge string="Metrics"><field name="amount" column_invisible="True"/></merge><field name="name"/></list>');
    expect("thead tr").toHaveCount(1);
});
test("optional fields update the visible group span",async()=>{
    await mount('<list><field name="name"/><merge string="Metrics"><field name="amount"/><field name="rate" optional="hide"/></merge></list>');
    expect(queryOne(".o_merge_group_header").colSpan).toBe(1);
    await contains(".o_optional_columns button").click();
    await contains('.o-dropdown-item:contains("Rate")').click();
    expect(queryOne(".o_merge_group_header").colSpan).toBe(2);
    expect('th[data-name=rate]').toHaveCount(1);
});
test("sorting grouped columns uses the native field header",async()=>{
    await mount(); await contains('th[data-name=amount]').click();
    expect(queryAllTexts('.o_data_row td[name=amount]')).toEqual(["10","20"]);
});
test("select all remains functional",async()=>{
    await mount(); await contains('thead .o_list_record_selector input').click();
    expect('.o_data_row .o_list_record_selector input:checked').toHaveCount(2);
});
test("native Odoo 20 column groups remain supported",async()=>{
    await mount('<list><column string="Identity"><field name="name"/><field name="category"/></column><merge string="Metrics"><field name="amount"/><field name="rate"/></merge></list>');
    expect('thead th:contains("Identity")').toHaveCount(1);
    expect(queryOne('.o_merge_group_header').colSpan).toBe(2);
});
test("resizing preserves header and body alignment",async()=>{
    await mount(); const before=queryOne('th[data-name=amount]').getBoundingClientRect().width;
    await contains('th[data-name=amount] .o_resize',{visible:false}).dragAndDrop('th[data-name=rate]');
    await animationFrame();
    const header=queryOne('th[data-name=amount]').getBoundingClientRect();
    const body=queryOne('.o_data_row:first td[name=amount]').getBoundingClientRect();
    expect(header.width).toBeGreaterThan(before);
    expect(header.width).toBeCloseTo(body.width,{margin:1});
    expect(queryOne('.o_merge_group_header').getBoundingClientRect().width).toBeCloseTo(header.width+queryOne('th[data-name=rate]').getBoundingClientRect().width,{margin:1});
});
test("inline one2many lists can display merge groups",async()=>{
    await mountView({type:"form",resModel:"merge.demo",resId:1,arch:'<form><field name="name"/><field name="lines"><list><merge string="Line metrics"><field name="amount"/><field name="rate"/></merge></list></field></form>'});
    expect('.o_field_one2many .o_merge_group_header').toHaveText("Line metrics");
    expect('.o_field_one2many .o_data_row td[name=amount]').toHaveText("10");
});
