import {loadScript, create_fs, get_heading, fix_table_heading, tbl_to_json, tbl_filter, set_style} from './util.js';
let root = "https://cdn.jsdelivr.net/npm/"
//let root = '/' //For testing
loadScript(root+'vega@5', function(script) {
    loadScript(root+'vega-lite@4', function(script) {
	loadScript(root+'vega-embed@5', function(script) {
	    console.log("Loaded all");
	})
    })
});

//loadScript('https://cdn.anychart.com/releases/8.9.0/geodata/custom/world/world.topo.js', function(script) { console.log("loaded topo") })

function graph_table(tbl, md, filtered, id) {
    //tbl -> reference to table to get the data
    //Data has the following info, advantage of passing an object?
    //g -> graph type
    //x -> x-axis for the plot
    //y -> y-axis for the plot
    //y2 -> secondary y-axis for the plot
    //t -> (deprecate?) was ('none' ,'ontop', 'onside', 'normalise'
    //f -> Aggregate function to apply when grouping data (when do i use this?)
    //p -> (recheck?) was ('column', 'rowseries')
    //filtered -> plotting only visible rows (if row_filter.js has hidden the rows
    //Get the table as a json object (format?)
    let rows = tbl_to_json(tbl, filtered);
    console.log('md passed', md);
    console.log('data passed', rows);

    function clean_colname(c) {
	return c.replace('.', '\\.')
    }
    
    function get_data(rows, md) {
	//Construct the data jsonl that is used for graphs
	let h_l = Object.keys(rows[0]); //ALl keys
	//let ignore = [md['x'], ...md['y'], md['xg']] //ignore the ones selected
	let ignore = []; //Ignore nothing for now
	let rest = h_l.filter(i=>!ignore.includes(i)); //this is the rest data
	let data = [];
	let y = md['y'];
	let x = md['x'];
	let xg = md['xg'];
	let anno = md['anno'];
	let ts = md['ts'];

	//Handle columnar data for box plots
	if (md['is_col']) {
	    console.log('columar data detected');
	    for (let i of rows) {
		let row = {};
		for (let h of y) {
		    //Ignore X for columnar plots
		    //Consider Y labels as index
		    //Consider Y values as input, treat it as numerical, remove anything that is not a number or a decimal point or the negative sign
		    //Ignore groupings
		    //No need to collect any additional data, as this is a summary plot
		    data.push({'column': h,
			       'value': parseFloat(i[h].replace(/[^0-9\.\-]/g,'')),
			       'index': i[x]});
		}
		//No collecting the rest???
	    }
	}
	//If grouping is selected and it is not the index itself (We disable multiple y-label selection)
	else if (xg != '' && xg != x) {
	    console.log('grouping of data detected');
	    md['y'] = [md['y'][0]];
	    for (let i of rows) {
		let row={};
		row = {'index': i[x], //x-axis is our index
		       'column': i[xg], // We select only one column y-axis
		       'value': parseFloat(i[y[0]].replace(/[^0-9\.\-]/g,''))}; // The value is the grouped result on the y-axis
		for (let j of rest) { row[j] = i[j]}; //collect the rest
		data.push(row);
	    }
	}
	//Else grouping is not used collect all y-label values
	else {
	    console.log('no grouping and no columnar data')
	    for (let i of rows) {
		let row={};
		//No grouping is done, we enable multiple y-label selection
		for (let h of y) {
		    //naming the field as x-axis column name, column name of the data that gets plotted, and value
		    //Why [x] ? - https://stackoverflow.com/questions/3153969/create-object-using-variables-for-property-name
		    row = {'index': i[x], //This becomes the x-axis of the graph, we will use the column name as heading
			   'column': h,   // This becomes the color separator within the x-axis, if x-axis is not unique
			   'value': parseFloat(i[h].replace(/[^0-9\.\-]/g,''))}  // This is the column that gets plotted on the y axis
		    
		}
		for (let j of rest) {row[j] = i[j]}; //collect the rest
		data.push(row);
	    }
	}
	return data;
    }
    //Get the values
    let data = [];
    data = get_data(rows, md);
    console.log('data parsed', data);
    //The top level spec for vega-lite
    let spec = {"$schema": "https://vega.github.io/schema/vega-lite/v4.json",
		'title': get_title(data, md)['text'].slice(0,200), //Limiting title to 200 characters
		'descripton': 'vega-lite ad-hoc plotter',
		'data': {'values': data}, //data from the selection is used for all graphs, so keeping it in top layer		
		"transform":[], //If any transform is needed
		'config': {'view': {'step': 20},
			   "scale": {"scheme": "category20"}},
		'width': 1200, //Default width
		'height': 400, //Default height
	       };
    //TRANSFORM data to run the aggregate functions as selected
    //There are problems with transform grouping on box plots, so skipping that
    let no_t = ['box', 'scatter', 'hist', 'kde', 'cdf', 'summary'];
    if (!no_t.includes(md['g'])) {
	spec['transform'].push({"aggregate": [{"op": md['f'], //agg function
    					       "field": "value", // agg input
    					       "as": "value"}], //Retaining the same name
    				"groupby": ['index', 'column']}) //groupby multiple fields
    };

    //Data transforms
    // If X-axis is a timeseries, convert into the specified timeformat
    if (md['is_ts'] && md['ts']) { //if format is specified, use it, otherwise let vega make the decision
	//Format spec: https://github.com/d3/d3-time-format/#isoParse
	spec['transform'].push({"calculate": "timeParse(datum.index, '"+md['ts']+"')",
				"as" : 'index'})
    }
    //If 'index' column is a number, add a transform action to treat it as numbers
    else if (!md['is_ts'] && Number(data[0]['index'])) {
	spec['transform'].push({'calculate': "toNumber(datum."+'index'+")", "as": 'index'});
    }
    // For scatter plots, remove any non-numerical character from index
    else if (md['g'] == 'scatter' && !md['is_ts']) {
	spec['transform'].push({'calculate': 'replace(datum.'+'index'+",/[^0-9\.\-]/g,'')", 'as': 'index'})
    }
    
    //If the column field is a number convert it into numeric, so it can get proper sorting when grouping
    if (Number(data[0]['column'])) {
	spec['transform'].push({'calculate': "toNumber(datum.column)", "as": 'column'});
    }
    
    //STACK spec
    let s_map = {'ontop' : true,
		 'normalize': 'normalize',
		 'overlap': false, //disable stacking
		 'center': 'center',
		 'onside': 'onside'};
    md['s'] = s_map[md['s']];

    //Choosing the right graph functions
    //Heatmap
    if (md['g'] == 'heatmap') {
    	spec['layer'] = rect(data, md);
    	spec['config'] = {'axis': {'grid': true, 'tickBand': 'extent', 'gridOpacity': 0.3}};
	if (md['anno']) {spec['layer'].push(add_annotation(data, md))};
    }
    
    //Bar plot
    else if (md['g'] == 'bar') {
    	if (md['s'] == 'onside') {
    	    spec['config'] = {'view': {"stroke": "transparent"}, 'axis': {"domainWidth": 1}};
    	    spec["facet"]= {'column': {"field": "column", "title": md['xg']}}; //Because row and column cannot go inside in a layerw
    	    spec["spec"] = {};
    	    //facet should have a spec
    	    spec['spec']['layer'] = bar(data, md);
    	    //Push the graph of a horizontal line as the threshold    		
    	    if (md['h']) { spec['spec']['layer'].push(hline(md['h']))};
	    if (md['anno']) {spec['spec']['layer'].push(add_annotation(data, md))};
    	}
    	else {
    	    spec['layer'] = bar(data, md);
    	    //Push the graph of a horizontal line as the threshold    	
    	    if (md['h']) { spec['layer'].push(hline(md['h']))};
	    if (!md['xg'] && md['anno']) {spec['layer'].push(add_annotation(data, md))};
	}
    }
    
    //Timeindexed line/area plot
    else if (md['g'] == 'timeindex' || md['g'] == 'timeindex_area') {
	//Choose area/line, both have same code
	if (md['g'] == 'timeindex')  {var type='line'} else {var type='area'};
	if (md['s'] == 'onside') {
    	    spec['config'] = {'view': {"stroke": "transparent"}, 'axis': {"domainWidth": 1}};
    	    spec["facet"]= {'column': {"field": "column", "title": md['xg']}}; //Because row and column cannot go inside in a layer
    	    spec["spec"] = {};
    	    //facet should have a spec
    	    spec['spec']['layer'] = line(data, md, type=type);
    	    //Push the graph of a horizontal line as the threshold    		
    	    if (md['h']) { spec['spec']['layer'].push(hline(md['h'])) };
	    //This one causes tooltip issue
	    spec['spec']['layer'].push(vline(data, md));	    
    	}
    	else {
    	    spec['layer'] = line(data, md, type=type);
    	    //Push the graph of a horizontal line as the threshold    	
    	    if (md['h']) { spec['layer'].push(hline(md['h']))};
	    spec['layer'].push(vline(data, md));
    	}
    }
    
    // //Box plot
    // else if (md['g'] == 'box') {
    // 	spec['config'] = {'view': {"stroke": "transparent"}, 'axis': {"domainWidth": 1}};
    // 	//columnar data does not need to have facet, as we are disabling grouping
    // 	if (md['is_col']) {spec['layer'] = box(data, md)}
    // 	//Because row and column cannot go inside in a layer	
    // 	else {spec["facet"] = {'column': {"field": "column", "title": md['xg']}};
    // 	      spec["spec"] = {};
    // 	      //facet should have a spec
    // 	      spec['spec']['layer'] = box(data, md)};
    // }

    //Circle plot
    else if (md['g'] == 'circle') {
	spec['layer'] = circle(data, md);
    }

    //Scatter plot
    else if (md['g'] == 'scatter') {
	//This assigns each row a rowidd
	//window runs from unbounded past to current, row_number operation gives a ordedred row number
	spec['transform'].push({"window": [{"op": "row_number", "as": "row_number"}]});
	//This ennsures legends are for each charts and not a combined one
	spec["resolve"] =  {"legend": {"color": "independent"}}

	//Since layer is used, hconcat needs to have the layered chart as it's first item
	//Stack scatter on top of the table
	spec['vconcat'] = [];
	spec['vconcat'].push({'layer' : scatter(data, md)});
	//The second chart will be a table of data, construct it
	let table = {}
	table = {"transform": [{"filter": {"selection": "brush"}},
			       {"window": [{"op": "rank", "as": "rank"}]},
			       {"filter": {"field": "rank", "lt": 10}}]};
	table['hconcat'] = [];
	//Print data on the scatter points, only if it is not column oriented
	//tooltips are still buggy
	if (!md['is_col']) { var h_l = Object.keys(rows[0]) //select all headings
			    for (let i of h_l) {table['hconcat'].push({"title": i,
								       "view": {"strokeWidth": 0},
								       "mark": "text",
								       "encoding": {
									   "text": {"field": clean_colname(i), "type": "nominal"},
									   "y": {"field": "row_number", "type": "ordinal", "axis": null}
								       }})}
			  }
	//Add it to the hconcat list
	spec['vconcat'].push(table);
    }

    //Histogram
    else if (md['g'] == 'hist') {
	if (md['s'] == 'onside') {
	    spec['height'] = 200;
	    spec['width'] = 200;
	    spec=Object.assign(spec, hist_onside(data, md));
	}
	else {spec=Object.assign(spec, hist(data, md))}
    }

    //KDE
    else if (md['g'] == 'kde') {
    	if (md['s'] == 'onside') {
    	    spec['height'] = 200;
    	    spec['width'] = 200;
    	    spec=Object.assign(spec, kde_onside(data, md))}
    	else {spec=Object.assign(spec, kde(data, md))}
    }

    //CDF
    else if (md['g'] == 'cdf') {
	if (md['s'] == 'onside') {
	    spec['height'] = 200;
	    spec['width'] = 200;
	    spec=Object.assign(spec, cdf_onside(data, md))}
	else {
	    //spec=Object.assign(spec, cdf(data, md))
	    spec['layer'] = [cdf(data, md)]
    	    spec['layer'].push(hline(0.95));

	}
    }
    
    //BOX
    else if (md['g'] == 'box') {
	if (md['s'] == 'onside') {
	    spec['height'] = 200;
	    spec['width'] = 200;
	    spec=Object.assign(spec, box_onside(data, md))}
	else {
	    spec['layer'] = [box(data, md)]
	}
    }

    //Statistical summaries
    else if (md['g'] == 'summary') {
	//hconcat -> [ {data, aggergate_transform, hconcat -> [mean, count ...]},
	//             {data, percentile_transform, hconcat -> [p75, p90, ...]} ]
	spec['hconcat'] = []
	spec['hconcat'].push(summary(data, md))
	spec['hconcat'].push(summary2(data, md))
    }

    //lag plot
    else if (md['g'] == 'lag') {
    	//spec['layer'] = line(data, md, type=type);
    	//Push the graph of a horizontal line as the threshold    	
    	//if (md['h']) { spec['layer'].push(hline(md['h']))};
	//spec['layer'].push(vline(data, md));
	if (md['s'] == 'onside') {
    	    spec['config'] = {'view': {"stroke": "transparent"}, 'axis': {"domainWidth": 1}};
    	    spec["facet"]= {'column': {"field": "column", "title": md['xg']}}; //Because row and column cannot go inside in a layer
    	    spec["spec"] = {};
    	    //facet should have a spec
    	    spec['spec']['layer'] = lag(data, md);
    	    //Push the graph of a horizontal line as the threshold    		
    	    if (md['h']) { spec['spec']['layer'].push(hline(md['h'])) };
	    //This one causes tooltip issue
	    //spec['spec']['layer'].push(vline(data, md));	    
    	}
    	else {
    	    spec['layer'] = lag(data, md);
    	    //Push the graph of a horizontal line as the threshold    	
    	    if (md['h']) { spec['layer'].push(hline(md['h']))};
    	}
    }
    
    console.log("Final spec", spec);
    var tooltipOptions = {
	theme: 'light'
    };
    //Push the chart to the page
    vegaEmbed("#viz"+id, spec, {tooltip: tooltipOptions})
	.then(result => console.log(result))
	.catch(console.warn);    
}

function get_title(data, md) {
    let t={};
    if (md['is_col']) {
	t['text'] = md['g'] + ' plot of ' + md['x'] + ' vs ' + md['y']
	if (md['g'] == 'box') {t['text'] = 'Box plot of '+md['y']}
    }
    else { 
	t['text'] = md['g'] + ' plot of ' + md['x'] + ' vs ' + ((md['xg'] != '' && md['xg'] != md['x']) ? md['y'] : data[0]['column'])+ (md['xg'] ? ' for each ' + md['xg'] : '')
    }
    
    if (md['f']) { t['subtitle'] = '(Aggregated using ' + md['f'] +')'}
    let uni = ['scatter', 'hist', 'kde', 'cdf', 'summary'];
    if (uni.includes(md['g'])) {t['text'] = md['g'] + ' plot of ' + (md['is_col'] ? md['y'] :  md['y'][0]) + (!md['is_col'] && md['xg'] ? (' for different ' + md['xg']) : '')}
    return t;
}

function hline(t) {
    //Now define the spec for the horizontal rule
    let rule = {};
    rule['mark']='rule';
    //rule['data']={"values": [{}]}; //This is needed otherwise it fails
    rule['encoding']={'y': {'datum': parseFloat(t)}, //threshold should be a non-string value here
		      'size': {'value': 1},
		      'color': {'value': 'red'}} ;
    return rule;
}

function vline(data, md) {
    let l = new Set();
    for (let r of data) {l.add(r['column'])};
    let tt = [];
    tt.push({"field" : 'index', "type": md['is_ts'] ? "temporal" : "ordinal", "format": "%b %d, %Y %H:%M:%S"});
    for (let r of l) {tt.push({"field": r})};
    var rule = {"mark": {"type" : "rule"},
		"transform": [{"pivot": "column", "value": "value", "groupby": ['index']}],
		"selection": {"hover": {"type": "single",
					"on": "mouseover",
					"nearest": true,
					"empty": "none",
					"clear": "mouseout",
					"fields": ['index']}},
		"encoding": {"x": {"field": 'index', 'type' : 'temporal'},
			     "opacity": {"condition":{"selection": "hover", "value": "0.3"},
					 "value": 0},
			     "tooltip": tt
			    }};
    return rule;
}

function add_annotation(data, md, color='black', t='quantitative', cond={}) {
    let text = {};
    text["mark"] = {"type": "text",
		    "align": md['g'] == 'heatmap' ? "center": "left",
		    "baseline": "middle",
		    "fontsize": 14,
		    'dx': md['g'] == 'heatmap' ? 0 : 3,
		    'angle': md['g'] == 'heatmap' ? 0 : -90};
    text['encoding'] = {'x': {'field': 'index'},
			'y': {'field': 'column'},
			"text": {"field": 'value', "type": t},
			"color": {"value": color}};
    if (md['g']=='bar') {text['encoding']['y']= {'field': 'value',
						 'type': 'quantitative'}};
    return text;
}

function summary(data, md) {
    let g = {}
    //The aggregate functions do not have percentile function
    // 'joinaggregate' only works with the standard aggfunctions
    // https://github.com/vega/vega-lite/issues/4439 - feature request 
    // 'calculate' operates on datum
    // Hence summary2
    g['transform'] = [{"aggregate":[]}]
    g['hconcat'] = []
    //g['data'] = data
    let gb='column';
    let s=['count', 'min', 'max', 'average', 'variancep', 'stdevp', 'median']
    
    for (let i of s) {
	g['transform'][0]['aggregate'].push({"op": i, "field": "value", "as": i})
    }
    g['transform'][0]['groupby']=[gb]
    g['transform'].push({'window': [{"op": "row_number", "as": "row_number"}]});
    let k = {};
    let l = new Set();
    for (let r of data) {l.add(r['column'])};
    g['hconcat'].push({"title": "Series",
		       "view": {"strokeWidth": 0},
		       "mark": "text",
		       "encoding": {
			   "text": {"field": gb, "type": "nominal"},
			   "y": {"field": "row_number", "type": "ordinal", "axis": null}}})
    for (let p of s) {g['hconcat'].push({"title": p,
					 "view": {"strokeWidth": 0},
					 "mark": "text",
					 "encoding": {
					     "text": {"field": p, "type": "nominal", "format": ".2s"},
					     "y": {"field": "row_number", "type": "ordinal", "axis": null}}})
		     }
    return g
}

function summary2(data, md) {
    //
    let g={}
    let gb='column'
    //For some reason adding 1.0 throws a parse error
	let p_l = ["0.75", "0.90", "0.95", "0.99"]
    g['hconcat'] = []
    g["transform"] =[{"quantile": "value",
		      "probs": p_l,
		      "groupby": ["column"],
		      "as": ["prob", "prob_value"]}]
    g["transform"].push({"pivot": "prob", "groupby": [gb], "value": "prob_value"})
    g['transform'].push({'window': [{"op": "row_number", "as": "row_number"}]});
    for (let p of p_l) {
	g['hconcat'].push({"title": 'p'+p,
			   "view": {"strokeWidth": 0},
			   "mark": "text",
			   "encoding": {
			       "text": {"field": '\\'+p, "type": "nominal", "format": ".2s"},
			       "y": {"field": "row_number", "type": "ordinal", "axis": null}}})
    }
    return g
}

function line(data, md, type='line') {
    //Can reuse the function for line and area
    let l_c = [];
    let l_g = {};
    l_g['mark'] = {'type': type, 'tooltip' : null};
    l_g['encoding'] = {"x": {"field": 'index',
			     "type": "temporal",
			     "axis": {"title": md['x']}},
		       "y": {"field": "value",
			     "type": "quantitative",
			     "axis": {"title": md['y'].join(',').slice(0,100)},
			     'stack': md['s']},
		       "color": {'field': 'column', 'title' : md['xg']}};
    l_g['encoding']['opacity'] =  {"condition": {"selection": "select", "value": 1},
				   "value": 0.2};
    l_g["selection"] = {'select' : {'type': 'multi', 'fields': ['column'], 'bind': 'legend'}};
    l_c.push(l_g);
    return l_c;
}

function lag(data, md) {
    let l_c = []
    let l_g = {};
    //Compute the lag function over a 1 unit (previous data point) - dy/dx 
    // The calculate function ensures that since the first lag value would be null, make sure dy = 0 (messes up the graph scale otherwise)
    l_g['transform'] = [{"window": [{"op": "lag", "field": "value", "as": "y1"}],
			 "groupby" : ['column']},
			{"calculate": "datum.value - (isValid(datum.y1) ? datum.y1 : datum.value)", "as": "dy"}]
    l_g['mark'] = {"type": "bar", "tooltip": true}
    l_g['encoding'] = {"x": {"type": "temporal", "field": 'index'},
		       "y": {"type": "quantitative", "field": "dy", 'stack': md['s']},
		       "color": {"field": 'column'}}
    l_g['encoding']['opacity'] =  {"condition": {"selection": "select", "value": 1},
				   "value": 0.2};
    l_g["selection"] = {'select' : {'type': 'multi', 'fields': ['column'], 'bind': 'legend'}};
    l_c.push(l_g)
    return l_c
}

function hist(data, md, col) {
    //A chart array, which can include all modifications/marks/plots
    let g = {};
    g['mark'] = {'type': 'bar', 'tooltip' : true};
    g['transform'] = [];
    let gb='column';
    //Filter to the column value
    //Create bins, bin_value, bin_value_end
    //Groupby bin_value, bin_value_end, grouping_col and aggregate using count
    //Join another column, which is an aggregate over whole set (count)
    //Create another column, which is a computation of count/totalcount for each row
    if (md['s'] == 'onside') {g['title'] = col; //Show column names as graph titles for each individual graphs
			      g['transform'].push({'filter': 'datum.column == ' + "'" + col + "'"})};
    g['transform'].push({'bin': {"maxbins": md['h']}, 'field': 'value', 'as': 'bin_value'},
			{'aggregate': [{'op': 'count', 'as': 'count'}],
			 'groupby': ["bin_value", "bin_value_end", gb]},
			{'joinaggregate': [{'op': 'sum', 'field': 'count', 'as' : 'totalcount'}], 'groupby': [gb]},
			{'calculate': 'datum.count/datum.totalcount', 'as': 'percentoftotal'},
			{"calculate": "toString(datum.bin_value) + '-' + datum.bin_value_end", "as": "bin"});
    g['encoding'] = {'x': {'field': 'bin_value', 'bin' : {'binned': true}},
		     'x2': {'field': 'bin_value_end'},
		     'y': {'type': 'quantitative', 'field': 'percentoftotal', "axis": {"format": ".1~%"}},
		     'color': {'field': gb},
		     'opacity': {"condition": {"selection": "select", "value": 1},
				 "value": 0.1},
		     //'facet': {'field': gb, 'type': 'nominal', 'columns': 4},
		     'tooltip': [{"field": "bin"},{"field": "count"}, {"field": "percentoftotal", "format": ".1~%"}, {'field': 'column'}]};
    g["selection"] = {'select' : {'type': 'multi', 'fields': ['column'], 'bind': 'legend'}};
    //g['title'] = col;
    return g;
}

function hist_onside(data, md) {
    let k = {};
    k['concat'] = [];
    k['columns'] = 4;
    let l = new Set();
    for (let r of data) {l.add(r['column'])};
    for (let i of l) {k['concat'].push(hist(data, md, i))};
    return k;
}

function kde(data, md, col) {
    let g = {};
    let gb = 'column';
    g['mark'] = {'type': 'line', 'tooltip': true};
    g['transform'] = [];
    if (md['s'] == 'onside') {g['title'] = col;
			      g['transform'].push({'filter': 'datum.column == ' + "'" + col + "'"})};
    g['transform'].push({'density': 'value', 'groupby': [gb]})
    g['encoding'] = {'x': {'field': 'value', 'type': 'quantitative'},
		     'y': {'field': 'density', "type": "quantitative"},
		     'color': {'field': gb},
		     'opacity': {"condition": {"selection": "select", "value": 1},
				 "value": 0.2}};
    g["selection"] = {'select' : {'type': 'multi', 'fields': ['column'], 'bind': 'legend'}};
    return g;
}

function kde_onside(data, md) {
    let k = {};
    k['concat'] = [];
    k['columns'] = 4;
    let l = new Set();
    for (let r of data) {l.add(r['column'])};
    for (let i of l) {k['concat'].push(kde(data, md, i))};
    return k;
}

function cdf(data, md, col) {
    let g = {}
    let gb = 'column'
    g['mark'] = {'type': 'line', 'tooltip': true};
    g['transform'] = [];
    if (md['s'] == 'onside') {g['title'] = col;
			      g['transform'].push({'filter': 'datum.column == ' + "'" + col + "'"})};
    //frame bounds the dataset on which the operation is applie
    //frame = null, 0 ... means, null->(unbounded)(all data included before and upto the current point; 0-> 0 data points to be included after the current point
    g['transform'].push({"sort": [{"field": "value"}],
			 "window": [{"op": "cume_dist", "field": "value", "as": "Cumulative Count"}],
			 "frame": [null, 0],
			 "groupby": [gb]});
    g['encoding'] = {'x': {'field': 'value', 'type': 'quantitative'},
		     'y': {'field': 'Cumulative Count', "type": "quantitative"},
		     'color': {'field': gb},
		     'opacity': {"condition": {"selection": "select", "value": 1},
				 "value": 0.2}};
    g["selection"] = {'select' : {'type': 'multi', 'fields': ['column'], 'bind': 'legend'}};
    return g;    
}

function cdf_onside(data, md) {
    let k = {};
    k['concat'] = [];
    k['columns'] = 4;
    let l = new Set();
    for (let r of data) {l.add(r['column'])};
    for (let i of l) {k['concat'].push(cdf(data, md, i))};
    return k;
}

function box(data, md, col) {
    //Start with the box_graph
    let box_g = {};
    box_g['transform'] = [];

    //Definition of box graph
    box_g['mark'] = {'type': 'boxplot', 'extent': 1.5, "median": {"color": "white"}, "ticks": true};
    //Metadata for box
    if (md['s'] == 'onside') {box_g['title'] = col;
			      box_g['transform'].push({'filter': 'datum.column == ' + "'" + col + "'"})};
    //If columnar data or no-x-axis situation - use column
    if (md['is_col']) {var gb = 'column'}
    else { var gb = 'index'};
    box_g['encoding'] = {'x': {'field': gb,'type' : 'nominal'},
			 'y': {'field': 'value', 'type': 'quantitative', "scale": {"zero": false}},
			 'color': {'field': gb, 'type': 'nominal'}};
    //Push it to the chart array
    return box_g;
}

function box_onside(data, md) {
    let k = {}
     k['concat'] = [];
    k['columns'] = 4;
    let l = new Set();
    for (let r of data) {l.add(r['column'])};
    for (let i of l) {k['concat'].push(box(data, md, i))};
    return k;
}

function circle(data, md) {
    let circ_c = [];
    let circ_g = {};
    circ_g['mark'] = {'type': 'circle', 'opacity': 0.8, 'stroke': 'black', 'strokeWidth': 1, 'tooltip': true};
    let circ_scat = false;
    if (circ_scat) {
	circ_g['encoding'] = {'x': {'field': 'index', 'type' : 'quantitative', 'axis': {'grid': 'false'}},
			      'y': {'field': 'value', 'type': 'quantitative'},
			      'color': {'field': 'column', 'type': 'nominal', 'legend': null},
			      'size': {'aggregate': md['f']}}
	
    }
    else {
	circ_g['encoding'] = {'x': {'field': 'index', 'type' : md['is_ts'] ? 'temporal' : 'ordinal', 'axis': {'grid': 'false'}},
			      'y': {'field': 'column', 'type': 'nominal', 'title': md['is_col'] ? null : md['xg']},
			      'color': {'field': 'value', 'type': 'quantitative', 'scale': {'scheme': 'lightmulti'}},
			      'size': {'field': 'value', 'type': 'quantitative'}}
	
    }
    circ_c.push(circ_g);
    return circ_c;
}

function scatter(data, md) {
    let scat_c = [];
    let scat_g = [];
    scat_g['width'] = 900;
    //Tool tip is not needed when is_col is selected, the current implementation is buggy
    scat_g['mark'] = {'type': 'point', 'filled': true, 'tooltip': (md['is_col'] ? null : true)};    
    scat_g['encoding'] = {'x': {'field': 'index', 'type': md['is_ts'] ? 'temporal' : 'quantitative', "scale": {"zero": false}, 'title': md['x']},
			  'y': {'field': 'value', 'type': 'quantitative', 'title' : md['y'], "scale": {"zero": false}},
			  'color': {'field': 'column', 'type': 'nominal'}};
    scat_g['selection'] = {'brush': {'type': 'interval'}};
 //   scat_g['encoding']['color']['condition'] = {'selection': 'brush',
//						'field': 'column',
//						'value': 'black'};
    scat_c.push(scat_g);
    return scat_c;
}

function bar(data, md, threshold=false) {
    let bar_c = []; //list to collect all charts
    let bar_g = {}; //Create a spec for the barchart (data is from the parent spec)
    //The data and encoding will be the source for all graphs in the layer
    bar_g['encoding'] = {"x": {"field": md['is_col'] ? 'column' : 'index',
			       "type": md['is_ts'] ? 'temporal' : 'ordinal',
			       'axis': {'title': md['x']}},
			 "y": {"field": "value",
			       "type": "quantitative",
			       "axis": {"title": md['y'].join(',').slice(0,100)},
			       "stack": md['s']},
			 "color": {"field": "column",
				   "type": "nominal"},
			 'facet': {'field': 'column', 'columns': 8}
			};
    bar_g['mark'] = {'type': 'bar', 'tooltip': true};
    bar_c.push(bar_g);
    return bar_c;
}


function rect(data, md) {
    let rect_c = [];
    let rect_g = {};
    rect_g['mark'] = {'type': 'rect', 'tooltip': true};
    //Making x-axis as temporal does not produce the expected results, it needs a specific timeunit to aggregate and then that messes up the results
    // Hack is to keep it as ordinal and change the axis formatting to time
    // Problem is that since time is not created as a linear continous - gaps in time will never be noticed
    rect_g['encoding'] = {'x': {'field': 'index', 'type': 'ordinal'},
			  //y-axis title is null if columnar data (the index will have column names), else use the grouping column
			  'y': {'field': 'column', 'title': md['is_col'] ? null : md['xg'], 'type': 'ordinal'},
			  'color': {'field': 'value', "type": "quantitative", "scale": {"scheme": "lightmulti"}}
			 };
    //This will cause the x-axis to be presented in a readable way, by reducing overlap if there are too many closely placed indexes
    if (md['is_ts']) {rect_g['encoding']['x']['axis'] =  {"labelOverlap": true}}
    rect_c.push(rect_g);
    return rect_c;
}
		      
function graph_options(g, f) {
    //default settings
    for (let e of f) {e.disabled = false};
    //f.is_col.disabled=true;
    //f.is_col.checked=false; //For the bug where once set to true, cannot be reverted if it gets disabled
    f.s.disabled=true;
    f.f.value='average';
    f.is_ts.disabled=true;
    f.is_ts.checked=false; //For the bug where once set to true, cannot be reverted if it gets disabled
    if (g == 'box' ) {f.f.disabled = true;
		      f.h.disabled = true;
		      f.anno.disabled = true;
		      f.is_col.disabled = false
		      f.f.value=null;
		      f.f.disabled = true;
		      f.s.disabled=false;};
    let uni=['hist', 'kde', 'cdf', 'summary'];
    if (g == 'hist' || g == 'kde' || g == 'cdf' || g == 'summary') {f.f.value=null;
								    f.f.disabled = true;
								    f.h.value=20;
								    f.s.disabled=false;
								    f.anno.disabled = true;
								    f.is_col.disabled = false;
								    f.x.disabled=true;
								    f.x.value=null};
    if (g == 'scatter') {f.f.disabled=true;
			 f.h.disabled=true;
			 f.anno.disabled=true,
			 f.is_ts.disabled=false};
    if (g == 'bar') {f.anno.diabled = true;
		     f.s.disabled = false;
		     f.is_ts.disabled = false;
		     f.is_col.disabled = false};
    if (g == 'heatmap') {f.h.disabled = true;
			 f.is_col.disabled = false;
			 f.is_ts.disabled=false};
    if (g == 'circle') {f.h.disabled = true;
			f.f.value = 'sum';
			f.anno.disabled = true;
			f.is_ts.disabled = false;
		        f.is_col.disabled = false;};
    if (g == 'timeindex' || g == 'timeindex_area' || g == 'lag') {f.s.disabled = false;
								  f.is_col.disabled = false;
								  f.is_ts.checked=true};

}

function graph(tbl, id) {
    //Fix the table heading right away
    fix_table_heading(tbl);
    let h_l = get_heading(tbl);
    //Setup a form to get the data required for graphing
    var form = document.createElement('form');
    form.name = 'wx-form_' + id;
    form.classList.add('wx-form');
    form.id = 'wx-form-id' + id;

    let graph_info = [{'type': 'select',
		       'label': 'Graph type=',
		       'items': ['bar', 'timeindex', 'timeindex_area', 'heatmap', 'circle', 'scatter', 'box', 'hist', 'lag', 'cdf', 'summary'],
		       'name': 'g'},
		      {'type': 'checkbox',
		       'label': 'Visible rows',
		       'name': 'incl'},
		      {'type': 'select',
		       'label': 'Stacking method=',
		       'items': ['ontop', 'onside', 'overlap', 'normalize'],
		       'default': 'ontop',
		       'name': 's'},
		      {'type': 'select',
		       'label': 'Aggregate method=',
		       'items': ['average', 'sum', 'count', 'min', 'max'],
		       'name': 'f',
		       'default': 'sum'},
		      {'type': 'input',
		       'label': 'Horizontal axis Threshold/Hist Bin Count',
		       'name': 'h'},
		      {'type': 'checkbox',
		       'label': 'annotate',
		       'name': 'anno'}]
    form.append(create_fs('Graph options', graph_info));
    form.g.onchange = (e) => {graph_options(form.g.value, form)};

    let data_info = [{'type': 'select',
		      'label': 'Index/X-axis',
		      'items':h_l,
		      'name':'x'},
		     {'type': 'select',
		      'label': 'Values/Y-axis',
		      'items':h_l,
		      'name':'y',
		      'multiple' : true},
		     {'type': 'select',
		      'label': 'Grouping/Hue',
		      'items':h_l,
		      'name':'xg'},
		     {'type': 'checkbox',
		      'label': 'is index a time?',
		      'name': 'is_ts'},
		     {'type': 'input',
		      'label': 'timeformat',
		      'name': 'ts'},
		     {'type': 'checkbox',
		      'label': 'column oriented',
		      'name': 'is_col'},
];
    form.append(create_fs('Data options', data_info));
    

    //Create a button to graph when clicked
    var but = document.createElement('button');
    form.append(but); //should be a part of our form
    tbl.insertAdjacentElement('beforebegin', form);
    but.setAttribute('type', 'button');
    but.setAttribute('id', 'form_' + i);
    but.textContent = 'Graph table';
    //Onclick collect all the data from the form fields and pass it on to graphing
    but.onclick = (e) => { let form = e.target.form;
			   //Collect the headings of values to plot
			   let y_h = [];			   
			   for (let i of form.y.selectedOptions) {y_h.push(i.value)};
			   //let y_h = [form.y.value];
			   //incl -> visible rows toggle
			   let filtered = form.incl.checked;
			   //x -> horizontal axis column heading
			   //y -> vertical axis column heading
			   //g -> graph type
			   //y2 -> vertical axis column heading for secondary axis graph heading
			   //f -> agg function
			   //s -> stacking type
			   //xg -> grouping horizontal axis - column heading
			   //h -> horizontal threshold
			   let data = {'x': form.x.value,
				       'y': y_h,
				       'g': form.g.value,
				       'y2': '',
				       'f': form.f.value,
				       's': form.s.value,
				       'xg': form.xg.value,
				       'h': form.h.value,
				       'anno': form.anno.checked,
				       'is_ts': form.is_ts.checked,
				       'ts': form.ts.value,
				       'is_col': form.is_col.checked};
			   graph_table(tbl=tbl, data, filtered, id);
			 }
    //Div for the graph
    let viz = document.createElement('div');
    viz.id = 'viz' + id ;
    //Experimenting responsive option for vega with the 'container' option
    viz.style.width = tbl.offsetWidth;
    tbl.insertAdjacentElement('beforebegin', viz)
}

set_style()
//Check for tables to add a graphing menu
let tbl = document.getElementsByTagName('table');
let i=0
for (let t of tbl) {
    //Ignore the table that do not have tbody
    if (t.tBodies.length >0) {
	//Counter to keep track of table count to use as id/name
	i++; let spec = graph(t, i)
	//Add row_filter functions
	tbl_filter(t)
    }
}

