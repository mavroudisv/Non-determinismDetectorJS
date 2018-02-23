/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const localFile = new Components.Constructor("@mozilla.org/file/local;1",
    "nsILocalFile", "initWithPath");

const appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
const ZipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");

const harVersion = "1.1";
const prefDomain = "extensions.firebug.netexport";

// ********************************************************************************************* //
// Implementation

/**
 * @module This object is responsible for storing data into a file.
 */
Firebug.NetExport.Exporter = extend(Firebug.Module,
/** @lends Firebug.NetExport.Exporter */
{
    DTA: null,
    dispatchName: "netExportExporter",

    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Exporter.initialize;");

        try
        {
            this.DTA = {};
            Components.utils["import"]("resource://dta/api.jsm", this.DTA);
        }
        catch (err)
        {
            this.DTA = null;

            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.Exporter.initialize; import DTA EXCEPTION " + err, err);
        }
    },

    internationalizeUI: function(doc)
    {
        if (this.DTA)
            return;

        var saveFilesMenu =  $("netExportSaveFiles", doc);
        if (!saveFilesMenu)
            return;

        // If DTA extension is not avaiable disable "save files" menu and set
        // different tooltip.
        saveFilesMenu.setAttribute("disabled", "true");
        var text = saveFilesMenu.getAttribute("tooltiptext");
        saveFilesMenu.setAttribute("tooltiptext", text + " " +
            $STR("netexport.menu.tooltip.disabled.Save_Files"));
    },

    exportData: function(context, jsonp)
    {
        if (!context)
            return;

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Exporting data for: " + context.getName());

        var panel = context.getPanel("net");

        // Build entries.
        var numberOfRequests = 0;
        panel.enumerateRequests(function(file) {
            if (file.loaded && file.requestHeaders && file.responseHeaders)
                numberOfRequests++;
        })

        if (numberOfRequests > 0)
        {
            // Get target file for exported data. Bail out, if the user presses cancel.
            var file = this.getTargetFile(context, jsonp);
            if (!file)
                return;
        }

        // Build JSON result string. If the panel is empty a dialog with warning message
        // automatically appears.
        var json = this.buildJSON(context);
        var jsonString = this.buildData(json);
        if (!jsonString)
            return;

        // Remember the original JSON for the viewer (in case it's changed to JSONP)
        var jsonStringForViewer = jsonString;

        // If JSONP is wanted, wrap the string in a function call
        if (jsonp)
        {
            var callbackName = Firebug.getPref(prefDomain, "jsonpCallback");

            // This callback name is also used in HAR Viewer by default.
            // http://www.softwareishard.com/har/viewer/
            if (!callbackName)
                callbackName = "onInputData";

            jsonString = callbackName + "(" + jsonString + ");";
        }

        if (!this.saveToFile(file, jsonString, context, jsonp))
            return;

        if (Firebug.getPref(prefDomain, "showPreview"))
        {
            var viewerURL = Firebug.getPref(prefDomain, "viewerURL");
            if (viewerURL)
                Firebug.NetExport.ViewerOpener.openViewer(viewerURL, jsonStringForViewer);
        }

        // Save files
        if (Firebug.getPref(prefDomain, "saveFiles"))
        {
            json = json.log.entries;

            // Populate the URL list and remove 404s.
            var fileList = [];
            var entryLength = json.length;
            for ( var i = 0; i < entryLength; i++ )
            {
                var entry       = json[ i ];
                var entryStatus = entry.response.status;
                var entryURL    = entry.request.url;

                //if (!(entryStatus === 404))
                    fileList[ fileList.length ] = entryURL;

                if (FBTrace.DBG_NETEXPORT)
                {
                    var out = entryURL + ' ' + entryStatus;
                   // (entryStatus === 404) ? out += ' -- skipped 404' : '';
                    FBTrace.sysout(out);
                }
            }

            // Remove duplicates.
            fileList = this.uniq(fileList.sort());
            var fileListLength = fileList.length;

            // File path is from the Save As dialog.
            var filePath = file.path;
            var defaultFolderName = this.getDefaultFileName( context ) + "_files";

            // Create DTA saveFile objects.
            for (var i=0; i<fileListLength; i++)
                fileList[i] = this.saveFile(filePath, defaultFolderName, fileList[i]);

            // Automatically download all files in the list.
            this.DTA.sendLinksToManager(window, true, fileList);
        }
    },

    // in_arr must be sorted.
    uniq: function(_in)
    {
        var out = [_in[0]];
        var old = _in[0];
        var _inLength = _in.length;

        for (var a=1; a<_inLength; a++)
        {
            var _new = _in[a];
            if (_new === old)
                continue;

            out[out.length] = _in[a];
            old = _new;
        }
        return out;
    },

    saveFile: function(filePath, defaultFolderName, url)
    {
        var aURL = url;
        var rgx_file_from_system_path = /[\/\\]([^\/\\]+)$/;

        var dirSave = new localFile(filePath.replace(rgx_file_from_system_path, ""));
        dirSave.append(defaultFolderName);

        // Match from the start until one or more '/' are found.
        // http://example.com/ => "http://"
        var rgx_url_protocol = /^[^\/]+\/+/;
        url = url.replace( rgx_url_protocol, "");

        var rgx_slash_after_question = /\?[^\/]+\//;
        // Doesn't work with slashes after a question mark.
        // http://example.com/folder/file.ext?a=b&c=/ => ""
        // Match from the last / to the end of the string.
        var rgx_file_from_url = /\/([^\/]+)$/;

        // If there's a '/' after a '?' then remove the query string.
        if (url.match( rgx_slash_after_question ))
        {
            //  http://example.com/folder/file.ext?a=b&c=/ =>
            // "http://example.com/folder/file.ext"
            // Match from the start until a ? is found.
            var rgx_before_query_string = /^[^\?]+/;
            url = url.match( rgx_before_query_string )[ 0 ].
                      replace( rgx_file_from_url, "" );
        }
        else
        {
            url = url.replace( rgx_file_from_url, "" );
        }

        // Note: String.trim() is moz-1.9.1+ (FX 3.5)
        // Supported DTA has this as minimum requirement anyway.
        var parts = url.split(/[\/\\]+/).map(function(e){
            return e.trim();
        });

        for each (var part in parts)
        {
            if (part)
                dirSave.append(part);
        }

        return {
            "url"         : aURL,
            "numIstance"  : 0,
            "referrer"    : null,
            "description" : "",
            "title"       : "",
            "mask"        : "*name*.*ext*",
            "dirSave"     : dirSave.path
        };
    },

    // Open File Save As dialog and let the user to pick proper file location.
    getTargetFile: function(context, jsonp)
    {
        var nsIFilePicker = Ci.nsIFilePicker;
        var fp = CCIN("@mozilla.org/filepicker;1", "nsIFilePicker");
        fp.init(window, null, nsIFilePicker.modeSave);
        fp.appendFilter("HTTP Archive Files","*.har; *.harp; *.json; *.zip");
        fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
        fp.filterIndex = 1;

        var extension = jsonp ? ".harp" : ".har";
        var defaultFileName = this.getDefaultFileName(context) + extension;

        // Default file extension is zip if compressing is on.
        if (Firebug.getPref(prefDomain, "compress"))
            defaultFileName += ".zip";

        fp.defaultString = defaultFileName;

        var rv = fp.show();
        if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace)
            return fp.file;

        return null;
    },

    getDefaultFileName: function(context)
    {
        var loc = Firebug.NetExport.safeGetWindowLocation(context.window);
        return  loc ? loc.host : "netData";
    },

    buildJSON: function(context, forceExport)
    {
        // Export all data into a JSON string.
        var builder = new Firebug.NetExport.HARBuilder();
        var jsonData = builder.build(context);

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.buildJSON; Number of entries: " +
                jsonData.log.entries.length, jsonData);

        if (!jsonData.log.entries.length && !forceExport)
        {
            alert($STR("netexport.message.Nothing to export"));
            return null;
        }

        return jsonData;
    },

    // Build JSON string from the Net panel data.
    buildData: function(jsonData)
    {
        if (!jsonData)
            return null;

        var jsonString = "";

        try
        {
            jsonString = JSON.stringify(jsonData, null, '  ');
        }
        catch (err)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.exportData EXCEPTION", err);
        }

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.buildData; Exported data:", jsonData);

        return jsonString;
    },

    // Save JSON string into a file.
    saveToFile: function(file, jsonString, context, jsonp)
    {
        var extension = jsonp ? ".harp" : ".har";

        try
        {
            var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                .createInstance(Ci.nsIFileOutputStream);
            foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate

            var doc = context.window.document;
            var convertor = Cc["@mozilla.org/intl/converter-output-stream;1"]
                .createInstance(Ci.nsIConverterOutputStream);

            convertor.init(foStream, "UTF-8", 0, 0);

            // The entire jsonString can be huge so, write the data in chunks.
            var chunkLength = 1024*1204;
            for (var i=0; i<=jsonString.length; i++)
            {
                var data = jsonString.substr(i, chunkLength+1);
                if (data)
                    convertor.writeString(data);
                i = i + chunkLength;
            }

            // this closes foStream
            convertor.close();
        }
        catch (err)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.Exporter; Failed to export net data " + err, err);

            return false;
        }

        // If no compressing then bail out.
        if (!Firebug.getPref(prefDomain, "compress"))
            return true;

        // Remember name of the original file, it'll be replaced by a zip file.
        var originalFilePath = file.path;
        var originalFileName = file.leafName;

        try
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.Exporter; Zipping log file " + file.path);

            // Rename using unique name (the file is going to be removed).
            file.moveTo(null, "temp" + (new Date()).getTime() + extension);

            // Create compressed file with the original file path name.
            var zipFile = CCIN("@mozilla.org/file/local;1", "nsILocalFile");
            zipFile.initWithPath(originalFilePath);

            // The file within the zipped file doesn't use .zip extension.
            var fileName = originalFileName;
            if (fileName.indexOf(".zip") == fileName.length - 4)
                fileName = fileName.substr(0, fileName.indexOf(".zip"));

            // But if there is no .har extension - append it.
            if (fileName.indexOf(extension) != fileName.length - 4)
                fileName += extension;

            var zip = new ZipWriter();
            zip.open(zipFile, 0x02 | 0x08 | 0x20); // write, create, truncate;
            zip.addEntryFile(fileName, Ci.nsIZipWriter.COMPRESSION_DEFAULT, file, false);
            zip.close();

            // Remove the original file (now zipped).
            file.remove(true);
            return true;
        }
        catch (err)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.Exporter; Failed to zip log file " + err.toString());

            // Something went wrong (disk space?) rename the original file back.
            file.moveTo(null, originalFileName);
        }

        return false;
    },
});

// ********************************************************************************************* //
// Viewer Opener

Firebug.NetExport.ViewerOpener =
{
    // Open online viewer for immediate preview.
    openViewer: function(url, jsonString)
    {
        var self = this;
        var result = iterateBrowserWindows("navigator:browser", function(browserWin)
        {
            return iterateBrowserTabs(browserWin, function(tab, currBrowser)
            {
                var currentUrl = currBrowser.currentURI.spec;
                if (currentUrl.indexOf("/har/viewer") >= 0)
                {
                    var tabBrowser = browserWin.getBrowser();
                    tabBrowser.selectedTab = tab;
                    browserWin.focus();

                    var win = tabBrowser.contentWindow.wrappedJSObject;

                    // Fill out the inout JSON text box.
                    var sourceEditor = $("sourceEditor", win.document);
                    sourceEditor.value = jsonString;

                    // Click the Append Preview button.
                    self.click($("appendPreview", win.document));

                    if (FBTrace.DBG_NETEXPORT)
                    {
                        FBTrace.sysout("netExport.openViewer; Select an existing tab",
                            tabBrowser);
                    }

                    return true;
                }
            })
        });

        // The viewer is not opened yet so, open a new tab.
        if (!result)
        {
            var tabBrowser = this.getTabBrowser();
            tabBrowser.selectedTab = tabBrowser.addTab(url);

            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netExport.openViewer; Open HAR Viewer tab",
                    tabBrowser.selectedTab.linkedBrowser);

            var self = this;
            var browser = tabBrowser.selectedTab.linkedBrowser;
            function onContentLoad(event) {
                browser.removeEventListener("DOMContentLoaded", onContentLoad, true);
                self.onContentLoad(event, jsonString);
            }
            browser.addEventListener("DOMContentLoaded", onContentLoad, true);
        }
    },

    onContentLoad: function(event, jsonString)
    {
        var win = event.currentTarget;
        var content = $("content", win.contentDocument);
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.DOMContentLoaded;", content);

        var self = this;
        function onViewerInit(event)
        {
            content.removeEventListener("onViewerInit", onViewerInit, true);

            var doc = content.ownerDocument;
            var win = doc.defaultView.wrappedJSObject;
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.onViewerInit; HAR Viewer initialized", win);

            // Initialize input JSON box.
            $("sourceEditor", doc).value = jsonString;

            // Switch to the Preview tab by clicking on the preview button.
            self.click($("appendPreview", doc));
        }

        content.addEventListener("onViewerInit", onViewerInit, true);
    },

    click: function(button)
    {
        var doc = button.ownerDocument;
        var event = doc.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0,
            false, false, false, false, 0, null);
        button.dispatchEvent(event);
    },

    getTabBrowser: function()
    {
        return top.document.getElementById("content");
    }
};

// ********************************************************************************************* //
// Registration

Firebug.registerModule(Firebug.NetExport.Exporter);

// ********************************************************************************************* //
}});
