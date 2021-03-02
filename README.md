# What does this repository contain?
  This directory contains the javascripts related to various scripts (but mostly towards data analysis for now).
  
# Script overview
  The files are intended to be used as bookmarklets, but can also be used as a script import on html pages. (Note that you need to use <script type="module" src="script.js"></script>, if it needs to be used in HTML pages, as the JS files imports many functions from util.js)
  
  1. **util.js** - Many functions to be used by other scripts
  2. **grapher.js** - For graphing HTML tables. This uses vegalite (https://vega.github.io/vega-lite/), so downloads 3 js files at the start.
  2. **row_filter.js** - For filtering HTML tables based on input condition
  3. **sorttable.js** - Provides sorting function for the HTML tables. (Not mine, found it in the wilderness of Internet, not sure of the owner, but a useful bookmarklet)
  4. **pivot_table.js** - Allows to pivot a HTML table based on input

# How to get the bookmarklets
  I use webpack application to generate the bookmarklet from the scripts. It generates a minified single line version of the script. After that I prepend `javascript:` to the file. The bookmark ready versions are also available at the scriptlet folder.
  
  1. Go to the scriptlet folder in this repository.
  2. It includes files as `SCRIPT.min.js`, open the script that you want add for a scriptlet.
  3. Click on the link **"Raw"** on the bottom-right.
  4. This opens a page with only the code, wait until it completes loading, and then copy the entire page (Select All and Copy)
  4. Right click on the bookmark bar and choose the **"Add page/New Bookmark"** option. A new window opens.
  5. Paste the contents as **"URL/Location"** in the options. Choose any name, preferably use the script that you are bookmarking.
  6. Use the bookmarklet on any table that has a HTML table. 

# Script details
## grapher.js
### Usage
1. For instructions on how to get the scripts accessible to run on web pages, check the "How to get the bookmarklets" section above.
2. Once the page is loaded with the html table, click on the bookmarklet on the bookmark bar. This will populate a set of options to choose to graph.
3. Choose the necessary options
4. Click on "Graph table"
5. The graph should show up above the table.

### Graph selection options

|Option | What does it do? |
|------|------|
|Graph type	| **For Univariate**: scatter, box, hist <br />**For Multivariate**: bar, timeindex, timeindex_area, heatmap, circle<br />**Text**: summary |
| Visible rows	 |If the graph should consider only the visible rows from the table. This is an addendum/helper of the rowfilter script that gets bundled, which allows filtering of rows to required conditions. |
|Stacking method	 | How multiple series should be handled.<br />Multiple series can show up when *using the "Grouping/Hue" option* or *by enabling "column oriented" and selecting multiple "Values/Y-axis"*<br />**ontop**: plot 1 value on top of another. This stacks each series in the same graph<br />**overlap**: plot the series in the same graph, no stacking is done.<br />**onside**: plot each series in its own graph. this repeats the graph (own axis).<br />**normalise**: scales the data points to the range [0,1] where 1 = sum of all data points. Plot in one graph.|
|Aggregate method	|Function that will be applied if there are multiple "Values/Y-axis" data points for each combination of "Index/X-axis" and "Grouping/Hue"|
|Horizontal axis Threshold/Hist Bin Count|Draws a horizontal line on the graph.<br />And for graph='hist', used to create count of bins that is needed.|
|Annotate|Annotate "value/y-axis" data on the graph|

### Data selection options
|Option | What does it do?|
|------|-----|
|Index/X-axis| The X-axis for the graph
|Values/Y-axis	|The Y-axis for the graph (Numerical data that needs to be plotted)|
|Grouping/Hue	| Grouping the index by another column, distinction of each group is usually made by using a different color |
|is index a time?	| If time axis is an index and needs to be treated as such - sorting time data and marking labels appropriately, otherwise the graphs would treat it as nominal (no ordering). (For heatmap the only action this option does is to prevent overlap of labels for better readability - and does not sort the index)|
|timeformat| If *is index a time?* is selected, this option allows specifying the parsing format that needs to be used (Format spec: https://github.com/d3/d3-time-format/#isoParse) |
|column oriented |If the columns of the table needs to be plotted. i.e there are multiple columns that needs to go as a different series in the graph.<br />When "column oriented is selected" - grouping/Hue is almost always ignored.|

### Caveats

1. pivot_table.js and grapher.js do not play well together
2. Running the script multiple times might create unexpected problems.

## row_filter.js
### Usage
1. grapher.js also includes row_filter code. So, should not be used if grapher.js is already used.
2. It creates an input box on the heading of each column, filters can be entered into this to filter the rows on conditions. It has a minimal set options 
3. All matches are case-insenstitve
4. Once a condition is added on a column, Enter key needs to be pressed. Each condition records the filter matches for it's own column within the column heading.
5. The caption above the table indicates all the conditions that are active and the final matching (or visible) rows. (Conditions of each column is ANDed)

### Options 

| Condition |  What it does |
| ----- | ----- |
|ABC | Uses globbing match, find all the rows with the column value which includes ABC|
|!ABC	| inverse of the globbing match above|
| <N	| rows with the column value less than N is shown (makes sense for numerical data, or for data which starts with numbers and has a character suffix at the end - like SI units)|
| >N	|same as above but shows only rows with column value greater than N|
|^ABC	| Starts with ABC|
|$ABC	| Ends with ABC|
|=ABC	| Exactly ABC  |
|@[N1,N2] | Show rows whose column values are between N1 and N2 inclusive (numerical data) |
| \| |  Implementation of boolean OR condition separates any of the above actions|

## sorttable.js
Provides sorting options for columns. Should be run only once. 2 sort options
1. Numeric sort
2. Alphabetical/Lexographical sort

Select one of the above options to switch the sort method on, and then click on the column that needs to be sorted.

**Owner of script**: Unknown

## pivot_table.js

Converts a long form table to a wide form table.
1. Multiple columns can be chosen for row index and Data, but only one for column index.
2. Working on large dataset (>500 rows) can take a really long time. 
3. UI issues on scrolling right.
4. Breaks if the table is broken or malformed (for example if the script is run before the table/page is completely loaded)
