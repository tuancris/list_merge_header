# Copyright 2026 Tuan Nguyen Van
# License LGPL-3 (https://www.gnu.org/licenses/lgpl-3.0.html)

{
    'name': 'List View Merge Header',
    'summary': 'Excel-like column grouping with merged headers in List/Tree views',
    'description': 'Group multiple columns under a shared label using the <merge> XML tag '
                   'in list/tree views, similar to merged cells in Excel.',
    'author': 'Tuan Nguyen Van',
    'website': 'nguyentuann1004@gmail.com',
    'category': 'Extra Tools',
    'version': '20.0.1.0.0',
    'sequence': -100,
    'depends': ['web'],
    'assets': {
        'web.assets_unit_tests': ['list_merge_header/static/tests/**/*.test.js'],
        'web.assets_backend': [
            'list_merge_header/static/src/scss/list_merge_header.scss',
            'list_merge_header/static/src/xml/list_merge_header.xml',
            'list_merge_header/static/src/js/list_merge_header.js',
        ],
    },
    'images': ['static/description/banner.png'],
    'license': "AGPL-3",
    'installable': True,
    'auto_install': False,
    'application': True,
}
