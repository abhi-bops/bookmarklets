export function set_style() {
    //Styling function if modularity is needed 
    //Set up the styling of the fieldset
    let wx_style = document.createElement('style');
    //Fixing the column headings on top
    let css = '.wx-fixed-t {position:sticky;top:0px;z-index:2}';
    //Fixing the first column on left
    css += '.wx-fixed-l {position:sticky;left:0px;z-index:2}';
    //For the fieldset design
    css += '.wx-fieldset {font-size: small; font-family: monospace; background: azure; border: 1px solid gray}';
    css += '.wx-form {width: max-content}';
    //For the fieldset items
    css += '.wx-fs-item {display: inline-grid; margin-right:10px}';
    //CSS Attribute selector to allow multi column filters
    css += 'tr[class*="filter_hidden"] { display: none }';
    //For the pivot table
    css += '.wx-pivot td {border: 1px solid grey; background-color: azure; padding:2px; white-space: nowrap}';
    css += '.wx-pivot table { color #363636; border-collapse: collapse; border-spacing: 0}';
    css += '.wx-pivot th {background-color: LightBlue; border: 1px solid grey; padding: 2px}';
    css += '.wx-pivot tbody tr:hover * {background-color: aliceblue}';
    wx_style.innerHTML = css;
    document.head.append(wx_style);
}

export function get_heading(t) {
    //This should be run only after fix_table_heading has been run, otherwise it returns empty
    let h = t.children[0].children[0];
    //Fixing table heading on every run, due to the table sorter issues mentioned in that code
    fix_table_heading(t)
    let h_l = [];
    //Get the column names from thet data attribute
    return [...h.cells].map(i=>i.dataset.colName)
}

export function fix_table_heading(t) {
    //Doc: Fix the heading, Add a thead and tBody, and sticky display classes
    //Input: t->table element
    //Output: none
    let h = t.children[0].children[0];
    //Fix for the table with empty first row
    if (h.cells.length == 0) {h = t.children[0].children[1]};
    //If it has already been applied, don't redo the addition steps
    if (!h.classList.contains('wx-thead')) {
	//Add a thead if it is not there and push the first row of the table into it
	if (!t.tHead) {
            let th = t.createTHead();
            th.appendChild(h);
	}
	//Applyting the common classes
	h.classList.add('wx-thead');
	h.classList.add('wx-fixed-t');
    //This is needed to keep the heading on top during overlap on scroll
	h.style.zIndex = 2;
	let hr = h.cells;
	for (let i=0; i<hr.length; i++) {
	    //If the heading is invalid, handle it
	    if (hr[i].textContent=="") {hr[i].textContent = 'column'+i};
	    //The replace action is to remove the sorting character added by the tables
	hr[i].setAttribute('data-col-name', hr[i].textContent.replace('▾', '').replace('▴','').trim())
	}
    }
    //We need to run this set of code even if class is not set, as the table sorter can be run any time
    //If the table sorter has created a heading in a row, move it to the thead
    let d=t.tBodies[0].rows;
    //It should be within first 3
    let x=Math.min(d.length, 3);
    //This is to store the row references so that it can be added to head later
    //Otherwise the loop counters mess up
    let tsort=[];
    for (let j=0; j<x; j++) {
	//Check for some signature to identify them
	if (d[j].querySelector('a[title="Undo sorting"]') || d[j].querySelector('a[title="Sort alphabetically"]') || d[j].querySelector('a[title="Sort numerically"]') || d[j].querySelector('*[title="Sort Ascending"]') ||  d[j].querySelector('*[title="Sort Descending"]')) {tsort.push(d[j])};
    }
    //Now push all the rows to head
    tsort.forEach((e)=>t.tHead.appendChild(e))
};

export function tbl_to_json (tbl, filtered=false) {
    //Convert the rows of the table into a list of item
    //Each item is a row translated as {'col1': 'val1', 'col2': 'val2'}
    let h_l = get_heading(tbl);
    let d = tbl.tBodies[0].rows;
    let items = [];
    for (let j=0; j<d.length; j++) {
        let r = {};
	//ignore rows with no cells
	if (d[j].cells.length == 0) { continue };
	//Relies on the row_filter.js naming of the class to hide rows, need to find a better way than having it as a dependency
	if (filtered == true && d[j].className.includes('filter_hidden')) { continue };
        for (let i=0; i<h_l.length; i++) {
	    r[h_l[i]] = d[j].cells[i].textContent;
        };
        items.push(r);
    }
    return items;
}

export function tbl_filter (tbl) {
    //Fix the table heading
    fix_table_heading(tbl)
    //The head will have all the columns names
    var head_l = tbl.tHead.children[0].children;
    //Random number to use in the input ids to differentiate in cases of multiple table (better ways?)
    let tblid = Math.floor(Math.random()*100)
    //Add a caption for the table, to pass any info, the caption would appear on top of the table
    // And would show the filters applied, filtered row count result (and any more info if needed)
    let caption = document.createElement('caption');
    caption.style.textAlign = 'left';
    caption.style.fontFamily = 'monospace';
    tbl.appendChild(caption);
    //https://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example
    //Looping through the columns
    for (let i=0; i<head_l.length; i++) {
	    //Add the input as a row under the tablehead, one for each column - ths is where filters are entered
	var rf_ip = document.createElement('input');
	//Copy the width of the heading cell and use it as the width of the input selector, otherwise choose 50px
	let cell_width = head_l[i].offsetWidth || 50;
	rf_ip.style.width = cell_width + 'px';
	rf_ip.setAttribute('type', 'text');
	rf_ip.setAttribute('placeholder', 'matches');
	rf_ip.setAttribute('id', 'rf_id_' + i + '_' + tblid);
	//Ajdust the cell width and run the filter_rows function if an enter is pressed
	// Cell width needed is judged as length of string input * 12px (assuming size of each font character is 12)
	//   + 6 to accomodate for padding and border on 2sides
	rf_ip.onkeyup = function(e) { if (e.keyCode == 13) { this.style.width = Math.max(this.value.length*11 + 6, 45) + 'px'; filter_rows(tbl, this.value, i) }};
	//Registering a onkeydown event to stop it from getting submitted (as a part of form)
	rf_ip.onkeydown = function(e) { if (e.keyCode == 13) { e.stopPropagation(); return false } };
	//Registering an onclick event to stop event bubbling to outer tags
	rf_ip.onclick = function(e) { e.stopPropagation() };
	//this will be used to report filter results of each column
	var span = document.createElement('span');
	span.className = 'wx-thead-span';
	//Marking the heading is sticky so that it appears on scrolling
	head_l[i].style.position = 'sticky';
	    head_l[i].style.top = '0px';
	//To avoid transparent table headings which are an issue during scrolling
	if (window.getComputedStyle(head_l[i], null).getPropertyValue('background-color') == 'rgba(0, 0, 0, 0)') {
	    head_l[i].style.backgroundColor = 'Gainsboro' };
	head_l[i].appendChild(rf_ip);
	head_l[i].appendChild(span);
    }
};

export function filter_rows(tbl, rf_ip, col_n=0) {
    //tbl -> reference to the table
    //rf_ip -> the filter input
    //col_n -> Column number where filtering applies
    //Cycle through the rows and hide the ones that are not requested
    let rows = tbl.tBodies[0].children;
    //To keep track of rows which has to be unhidden,useful for "|" condition
    let unhide_rows = [];
    // To account for the problem that once rows are hidden, if the filter is removed, Enter has to be pressed
    let unhide_cols = [];
    //Get the values of the filters applied
    fix_table_heading(tbl)
    let heading_l = tbl.tHead.children[0].children;
    let filters = '';
    for (let cell=0; cell<heading_l.length; cell++) {
	let val = heading_l[cell].getElementsByTagName('input')[0].value;
	//Update some data only when a filter is present
	if (val.trim()) {
	    let head = heading_l[cell].firstChild.textContent;
		filters += ' ['+head+':'+val+']';
	}
	else {
	    //Make sure to unhide the columns which have no filters later
	    unhide_cols.push(cell);
	    //Clear the match count
	    tbl.tHead.children[0].children[cell].querySelector('.wx-thead-span').textContent = '';
	}
	};
    //GOing through each row to make the check
    for (let i=0; i<rows.length; i++) {
	//Through each or expression (not really useful for > and <
	for (let filter of rf_ip.toLowerCase().split('|')) {
	    //The cell value
	    let ip = rows[i].children[col_n].textContent.toLowerCase().trim();
	    //Check if its a > / < / ^ / $ / ! / @[]
	    //Greater than
	    if (filter.startsWith('<')) {
		let val = filter.split('<')[1];
		// remove anything other than numbers and decimal point
		ip = ip.replace(/[^0-9\.]/g,'');		    
		if (Number(ip) < Number(val)) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
	    // Less than
	    else if (filter.startsWith('>')) {
		// remove anything other than numbers and decimal point
		ip = ip.replace(/[^0-9\.]/g,'');
		let val = filter.split('>')[1];
		if (Number(ip) > Number(val)) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
	    //Starts with
	    else if (filter.startsWith('^')) {
		//Filter to values regex start
		let val = filter.split('^')[1].toLowerCase();
		if (ip.startsWith(val)) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
	    //ENDS with match condition
	    else if (filter.startsWith('$')) {
		//Filter to values regex end
		let val = filter.split('$')[1].toLowerCase();
		if (ip.endsWith(val)) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
	    //NOT match condition
	    else if (filter.startsWith('!')) {
		let val = filter.split('!')[1].toLowerCase();
		if (!ip.includes(val)) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
		//Exact match
	    else if (filter.startsWith('=')) {
		let val = filter.split('=')[1];
		if (ip == val) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
	    //Range match
	    else if (filter.startsWith('@[')) {
		let val = filter.split('@[')[1].replace(']','');
		let start = Number(val.split(',')[0]);
		let end = Number(val.split(',')[1]);
		// remove anything other than numbers and decimal point
		ip = Number(ip.replace(/[^0-9\.]/g,''));
		if (ip >= start && ip <= end) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
	    //Default is a substring match
	    else {
		if (ip.includes(filter)) {
		    rows[i].classList.remove('filter_hidden_' + col_n);
		    unhide_rows.push(i);
		}
	    }
	}
	//Hide the rest
	if (!unhide_rows.includes(i)) {
	    rows[i].classList.add('filter_hidden_' + col_n);
	}
	//Make sure to unhide the columns which have no filters 
	unhide_cols.forEach((col) => {rows[i].classList.remove('filter_hidden_' + col)});
    }
    //Get the span element in the heading for update
    tbl.tHead.children[0].children[col_n].querySelector('.wx-thead-span').textContent = "=" + unhide_rows.length;
    //Visible rows in caption
    //Compute the visible rows based on the class on each row
    //Total rows - hidden rows
	let visible_rows = rows.length - tbl.tBodies[0].querySelectorAll('tr[class*="filter_hidden"]').length;
    tbl.caption.textContent = 'Total ' + visible_rows + ' rows visible; Filters =' + filters;
};

export function pivot_table(tbl, x_h=[], y_h, xy_h, xy_f='flat', tbl_id='') {
    //Pivoting table function
    //TABLE > THEAD > TR_HTML_COLLECTION
    fix_table_heading(tbl);
    let h_l = get_heading(tbl);
	//TABLE > TBODY > TR_HTML_COLLECTION
    let d = tbl.tBodies[0].rows;
    let t_d = [];
    //Build the table Object
    //jsonl object with each row as a dict object
    for (let j=0; j<d.length; j++) {
	let r = {};
	for (let i=0; i<h_l.length; i++) {
	    r[h_l[i]] = d[j].cells[i].textContent
	}
	t_d.push(r)
    }
    //Adding an id to that table - so that it is accesible to us later
    tbl.id += ' wx-orig' + tbl_id;
    
    //Get the rest od the headings to be a part of a tooltip
    let rest = h_l;
    rest = rest.filter(i => i!=y_h && i!=x_h); //exclude x and y heading
    rest = rest.filter(i => !xy_h.includes(i)); //exclude the xy value heading
    
    //Create the X-axis index
    let x_set = new Set();
    //for each row, add the value under x_heading into x_set (set is to get unique values)
    t_d.forEach((r) => {x_set.add(r[x_h])});
    let x_l = [...x_set]; //make it into a array object
    
    //build a dictionary for storing the index value
    let y_d = {};
    for (let i of y_h) { y_d[i]=new Set();
			 t_d.forEach((r) => {y_d[i].add(r[i])});
			 y_d[i] = [...y_d[i]];
		       };
    
    
    
    // r = {ya1,yb1: {'y': [ya, yb], 'data': {x1: [{xy1: N1}, {xy2: N2}], x2: [{xy1: N1}, {xy2: N2}]}, 'rest' : {'cola' : val}},
    //      ya2,yb2: {... }}
    let r = new Map(); //Someday, if something blows up, here is where you have to start
    for (let i of t_d) {
	//Create an array which holds the y-keys
	let y = []
	for (let j of y_h) {
	    y.push(i[j])
	}
	//Check if the dictionary key with the index-key combo exists
	//Otherwise create one ... this becomes the ya1,yb1 for our obj definition (above)
	//We need to store the y-keys again as an array in the map, because keys 
	// are stored as comma separated strings
	if (!r[y]) { r[y] = {'y': y, 'data':{}, 'rest': {}} };
	//rest is the data that was not selected as index/series/values (which will show up/used as a tooltip)
	for (let p of rest) {
	    //Keeping the rest of the values in a set to avoid duplication and to give an overview of what other values of the 'rest columns' make up that pivot-ed row
	    if (!r[y]['rest'][p]) { r[y]['rest'][p] = new Set() };
	    r[y]['rest'][p].add(i[p])
	    };
	//Get the data of XY to populate
	//Iterate through the Series values
	for (let x of x_l) {
	    //Create a sub element within data to store the index-series combo result
	    if (!r[y]['data'][x]) { r[y]['data'][x] = {} };
	    //Iterate through the XY columns
	    for (let xy of xy_h) {
		//xy1, xy2 get populated here
		if (!r[y]['data'][x][xy]) { r[y]['data'][x][xy] = [] };
		//Validated the x and y values of the row
		if (i[x_h] == x) { r[y]['data'][x][xy].push(i[xy])}
	    }
	}
    }
    
    function filter_cols(col, x_l) {
	//Col->Column to be filtered
	//x_l->columnList
	let unhide = new Set();
	for (let x of x_l) {
		//If there are no user inputs, unhide every column
	    if (col.trim()=='') {
		document.querySelectorAll('*[data-x-id="'+x+'"]').forEach(i=>i.hidden=false)
		}
	    //Otherwise hide everything and collect what needs to be unhidden
	    else {
		//Hide everything
		document.querySelectorAll('*[data-x-id="'+x+'"]').forEach(i=>i.hidden=true);		    
		//Get the columns that needs to be unhidden
		//Cycle through all the inputs
		//Check if it has a special character to perform a filter action (no spec char = glob match)
		//filter through the x/Series heading list using the action
		//Add it to the set unhide
		for (let h of col.split('|')) {
		    if (h.startsWith('^')) {
			x_l.filter(i=>i.startsWith(h.split('^')[1])).forEach(unhide.add, unhide)
		    }
		    else if (h.startsWith('$')) {
			x_l.filter(i=>i.endsWith(h.split('$')[1])).forEach(unhide.add, unhide)
		    }
		    else if (h.startsWith('!')) {
			x_l.filter(i=>i != h.split('!')[1]).forEach(unhide.add, unhide)
		    }
		    else if (h.startsWith('=')) {
			x_l.filter(i=>i == h.split('=')[1]).forEach(unhide.add, unhide)
		    }
		    else {
			x_l.filter(i=>i.toLowerCase().includes(h.toLowerCase())).forEach(unhide.add, unhide)
		    }
		}
	    }
	};
	//Convert into list
	unhide = [...unhide];
	//Unhide the ones that needs to be unhidden
	if (!col.trim()=='') {
	    for (let x of unhide) {
		document.querySelectorAll('*[data-x-id="'+x+'"]').forEach(i=>i.hidden=false)
	    }
	}
    };
	
    //Start building the pivot table
    let n_t = document.createElement('table');
    //id got from function call (???)
    n_t.id = tbl_id;
    n_t.classList.add('wx-pivot');
    let th = n_t.createTHead();
    th.classList.add('wx-fixed-t'); 
    let thr1 = th.insertRow();
    //Heading has 2 rows
    //1st row -> Index_cols, Series_values
    //    ->Index cols has a colspan of number of index cols needed
    //2nd row -> Index_col1, Index_col2 (the colspan of 1st row Index_cols should end here) ... Series_col (repeating for each series_val in 1st row)
    
    //1st row - 1st cell (handling the metadata for the table)
	//One column each for the index col
    for (let h of y_h) {
	let th = document.createElement('th');
	    th.textContent = h;
	th.classList.add('wx-fixed-l');
	th.classList.add('wx-fixed-t');
	th.style.zIndex = 3 //To put the heading over rest
	thr1.appendChild(th);
    }	
    //1st row, 2nd cell onwards, adding the series values
    //Get all the headings of the x-axis set printed out
    //Each series column (X-axis) would need the length of the samples that needs to be displayed
    let head_colspan = xy_h.length;
    for (let x of x_l) {
	let th = document.createElement('th');
	    th.setAttribute('colspan', head_colspan);
	th.setAttribute('data-x-id', x);
	th.classList.add('wx-fixed-t');
	th.textContent = x;
	thr1.appendChild(th);
    };
    
    //Now for the second row
    let thr2 = th.insertRow();
    //Create the heading
    let thd = document.createElement('th');
    thd.setAttribute('colspan', y_h.length);
    //A column filter
    var div = document.createElement('div');
    var span = document.createElement('span');
    span.textContent = x_h;
    div.appendChild(span);
    var cf_ip = document.createElement('input');
    div.appendChild(cf_ip);
    cf_ip.setAttribute('type', 'text');
    cf_ip.setAttribute('placeholder', x_h + ' matches');
    cf_ip.setAttribute('id', 'x_id' );
    cf_ip.classList.add('wx-input-cf');
    cf_ip.onkeyup = function(e) { if (e.keyCode == 13) {filter_cols(this.value, x_l) }};
    cf_ip.onkeydown = function(e) { if (e.keyCode == 13) { return false } };
    thd.append(div);
	thr2.append(thd);
    
    //Now repeating the XY column names, repeating for each Series value from 1st row
    for (let i=0; i<x_l.length; i++) {
	for (let h of xy_h) {
	    let th = document.createElement('th');
	    th.setAttribute('data-x-id', x_l[i]);
	    th.setAttribute('data-xy-id', h);
	    th.textContent = h;
	    thr2.appendChild(th)
	}
    };
    
    //Heading is done now, Adding the data
    let tb = document.createElement('tbody');
    n_t.appendChild(tb);
    for (let i in r) {
	//The y-axis index
	let tr = document.createElement('tr');
	tb.appendChild(tr);
	//Add all the y_axis col values first
	for (let v of r[i]['y']) {
	    let td = document.createElement('td');
	    td.textContent = v;
	    td.classList.add('wx-fixed-l');
	    //Disable tooltip until I can figure out a better way
	    //let rest = '';
	    //for (let d in r[i]['rest']) {
	    //rest += d + ':' + [...r[i]['rest'][d]].join('|') + '\n'
	    //}
	    //td.setAttribute('title', rest);
	    tr.append(td);		
	}
	//The XY data
	for (let x of x_l) {
	    for (let xy of xy_h) {
		let td = document.createElement('td');
		td.setAttribute('data-x-id', x);
		td.setAttribute('data-xy-id', xy);
		//Execute the function on the xy_v list
		let f=eval(xy_f);
		let xy_v = r[i]['data'][x][xy];
		let result = '';
		//This if condition might not be needed 
		if (xy_v.length > 0) {
		    result=f(xy_v)
		}
		//If result is not an empty string
		td.textContent = (result !== '' ? result : '-')
		tr.append(td)		    
	    }
	}
    }
    
    //Add option to toggle visibility original table and hide it
    let but_tag = document.createElement('button');
    but_tag.id = tbl_id + '_button';
    if (tbl.hidden) { but_tag.textContent = 'Show original table' }
    else { but_tag.textContent = 'Hide original table'};
    but_tag.onclick = () => {
	if (tbl.hidden) {
	    tbl.hidden=false;
	    but_tag.textContent = 'Hide original table';
	    //we don't want the button to trigger any form submission
	    return false;
	}
	else {
	    tbl.hidden=true;
	    but_tag.textContent = 'Show original table';
	    //we don't want the button to trigger any form submission
	    return false;
	}
    };
    tbl.insertAdjacentElement('beforebegin', but_tag);
    
    //Add the newly created table after the original table
    tbl.insertAdjacentElement('afterend', n_t);
    //Add a row filter
    tbl_filter(n_t)
}

export function pivot(tbl, id='') {
    //check if there is a form already created, could be from grapher
    // it starts with wx-form-id
    let form = document.querySelectorAll('[id^="wx-form-id' + id +'"]')[0]
    //Create one if it dows not exist
    if (!form) {
	form = document.createElement('form');
	form.name = 'wx-form-id' + id;
	form.classList.add('wx-form');
	tbl.insertAdjacentElement('beforebegin', form);
    }
    let h_l = get_heading(tbl);
    let pivot_info = [{'type': 'select',
		       'label': 'Row Index',
		       'items':h_l,
		       'name':'y_pv',
		       'multiple' : true},
		      {'type': 'select',
		       'label': 'Column Index',
		       'items':h_l,
		       'name':'x_pv'},	
		      {'type': 'select',
		       'label': 'Data',
		       'items':h_l,
		       'name':'xy_pv',
		       'multiple': true},
		      {'type': 'select',
		       'name': 'xyf_pv',
		       'label': 'Aggfunc',
		       'items': ['flat', 'mean', 'sum', 'max', 'min'],
		       'default': 'sum'}];
    //Get the button in the form
    let but_f = form.getElementsByTagName('button')[0];
    //if it exists, insert before the graphing button
    if (but_f) {
	but_f.insertAdjacentElement('beforebegin', create_fs('Pivoting options', pivot_info))
    }
    //else append to form
    else {form.append(create_fs('Pivoting options', pivot_info))}
    var but = document.createElement('button');
    form.append(but);
    but.setAttribute('type', 'button');
    but.setAttribute('id', 'form_' + id);
    but.textContent = 'Create Pivot table';
    but.onclick = (e) => { let form = e.target.form;
			   let x_h = form.x_pv.value;
			   let y_h = []
			   for (let o of form['y_pv'].selectedOptions) { y_h.push(o.value) }
			   let xy_h = [];
			   for (let o of form['xy_pv'].selectedOptions) { xy_h.push(o.value) }			   
			       let xy_f = form.xyf_pv.value;
			   let tbl_id = 'wx-pivot' + id;
			   if (document.getElementById(tbl_id)) {
			       document.getElementById(tbl_id).remove();
			       document.getElementById(tbl_id+'_button').remove()
			   }
			   pivot_table(tbl, x_h, y_h, xy_h, xy_f, tbl_id)
			 }
}


//the aggregation functions
function flat(a) {
    return a.join('|')
}
function mean(a) {
    return (a.reduce((a,c) => to_num(a)+to_num(c), 0)/a.length).toFixed(2)
}
function to_num(v) {
    //Convert a string to number
    if (!v) { return null};
    if (typeof(v) != 'string') { return v };
    return Number(v.trim().replace(/[^0-9\.]/g,''))
};
function sum(a) {
    return a.reduce((a,c) => to_num(a)+to_num(c), 0)
}    
function max(a) {
    return a.reduce((a,c) => Math.max(to_num(a), to_num(c)))
}
function min(a) {
    return a.reduce((a,c) => Math.min(to_num(a), to_num(c)))
}

export function create_fs(l='', fs_item=[]) {
    //Fieldsets grouped for reuse
    let fs = document.createElement('fieldset');
    fs.classList.add('wx-fieldset');
    let leg = document.createElement('legend');
    leg.textContent = l;
    fs.append(leg);
    //Create a div around the fieldset, for hiding and showing the data
    let topd = document.createElement('div');
    fs.append(topd);
    for (var i of fs_item) {
	let d = document.createElement('div');
	d.classList.add('wx-fs-item');
	let l = document.createElement('label');
	l.textContent = i['label'];
	d.append(l);
	if (i['type'] == 'select') {
	    let s = document.createElement('select');
	    s.name = i['name'];
	    //If multiple options needs to be selected
	    if (i['multiple']) {s.multiple = true; s.size=4};
	    //If no default is needed
	    if (!i['default']) {let o=document.createElement('option');
				o.selected=true;
				o.text='-';
				o.value='';
				s.add(o)}
	    for (let j of i['items']) {
		let o = document.createElement('option');
		o.text=j; o.value=j; s.add(o);
		if (i['default']) { i['default'] == j ? o.selected=true : false}
	    }
	    d.append(s);
	}
	if (i['type'] == 'checkbox') {
	    let ip = document.createElement('input');
	    ip.type='checkbox';
	    ip.name=i['name'];
	    d.append(ip);
	}
	if (i['type'] == 'input') {
	    let ip = document.createElement('input');
	    ip.type='input';
	    ip.name=i['name'];
	    //https://stackoverflow.com/questions/895171/prevent-users-from-submitting-a-form-by-hitting-enter
	    ip.onkeydown = function(e) { return event.key != 'Enter';} 
	    d.append(ip);
	}
	topd.append(d);
    }
    return fs
}

export function loadScript(src, callback) {
    //https://javascript.info/callbacks
    let script = document.createElement('script');
    script.src = src
    script.onload = () => callback(script);
    document.head.append(script);
}
