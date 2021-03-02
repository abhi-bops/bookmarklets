# What does this repository contain?
  This directory contains the javascripts related to various scripts (but mostly towards data analysis for now).

# Usage
  The files are intended to be used as bookmarklets, but can also be used as a script import on html pages. (Note that you need to use <script type="module" src="script.js"></script>, if it needs to be used in HTML pages, as the JS files imports many functions from util.js)
  
  1. util.js - Many functions to be used by other scripts
  2. grapher.js - For graphing HTML tables. This uses vegalite (https://vega.github.io/vega-lite/), so downloads 3 js files at the start.
  2. row_filter.js - For filtering HTML tables based on input condition
  3. sorttable.js - Provides sorting function for the HTML tables. (Not mine, found it in the wilderness of Internet, not sure of the owner, but a useful bookmarklet)
  4. pivot_table.js - Allows to pivot a HTML table based on input

# How to get the bookmarklets
  I use webpack application to generate the bookmarklet from the scripts. It generates a minified single line version of the script. After that I prepend `javascript:` to the file. The bookmark ready versions are also available at the scriptlet folder.
  
  1. Go to the scriptlet folder in this repository.
  2. It includes files as SCRIPT.min.js, open the script that you want add for a scriptlet.
  3. Click on the link "Raw" on the bottom-right.
  4. This opens a page with only the code, wait until it completes loading, and then copy the entire page (Select All and Copy)
  4. Right click on the bookmark bar and choose the "Add page/New Bookmark" option. A new window opens.
  5. Paste the contents as "URL/Location" in the options. Choose any name, preferably use the script that you are bookmarking.
  6. Use the bookmarklet on any table that has a HTML table. 
