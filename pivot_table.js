//    if (window.hasRun) {return};
//    window.hasRun = true;
import {create_fs, get_heading, fix_table_heading, set_style, pivot_table, tbl_filter, pivot} from './util.js';
set_style()

//Check for tables to add a menu
let tbl_l = document.getElementsByTagName('table');
//Don't consider tables which are already pivoted by us
tbl_l = [...tbl_l].filter(i=>!i.id.includes('wx-pivot'))
let i=0
for (let tbl of tbl_l) {
    //Ignore the table that do not have tbody
    if (tbl.tBodies.length >0) {
	//Counter to keep track of table count to use as id/name
	i++;
	pivot(tbl, i)
    }
}

