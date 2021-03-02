//Functions from util.js
import {get_heading, fix_table_heading, tbl_filter, set_style} from './util.js';
set_style();
var tbl_l = document.getElementsByTagName('table');
for (var tbl of tbl_l) {
    try { tbl_filter(tbl) }
    catch (e) { console.log(e) }
}
