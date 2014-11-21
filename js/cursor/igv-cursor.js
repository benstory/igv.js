/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var igv = (function (igv) {

    igv.createCursorBrowser = function (options) {

        var horizontalScrollBarContainer,
            contentHeader,
            trackContainer,
            browser,
            thang;

        // Append event handlers to Header DIV
        document.getElementById('zoomOut').onclick = function (e) {
            browser.zoomOut()
        };
        document.getElementById('zoomIn').onclick = function () {
            browser.zoomIn()
        };
        document.getElementById('fitToScreen').onclick = function () {
            browser.fitToScreen();
        };
        document.getElementById('regionSizeInput').onchange = function (e) {

            var value = $("#regionSizeInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setRegionSize(parseFloat(value, 10));
        };
        document.getElementById('frameWidthInput').onchange = function (e) {

            var value = $("input[id='frameWidthInput']").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setFrameWidth(parseFloat(value, 10));

        };
        document.getElementById('trackHeightInput').onchange = function (e) {

            var value = $("#trackHeightInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setTrackHeight(Math.round(parseFloat(value, 10)));
        };

        // export regions via modal form
        $("#igvExportRegionsModalForm").submit(function (event) {

            var exportedRegions = "",
                downloadInput = $("#igvExportRegionsModalForm").find('input[name="downloadContent"]');

            browser.cursorModel.filteredRegions.forEach(function (region) {
                exportedRegions += region.exportRegion(browser.cursorModel.regionWidth);
            });

            downloadInput.val(exportedRegions);

            $('#igvExportRegionsModal').modal('hide');

        });

        // save session via modal form
        $("#igvSaveSessionModalForm").submit(function (event) {

            var session,
                downloadInput;

            session = browser.session();
            downloadInput = $("#igvSaveSessionModalForm").find('input[name="downloadContent"]');

            downloadInput.val(session);

            $('#igvSaveSessionModal').modal('hide');

        });

        // session upload
        var sessionInput = document.getElementById('igvSessionLoad');
        sessionInput.addEventListener('change', function (e) {

            var fileReader = new FileReader(),
                sessionFile;

            sessionFile = sessionInput.files[ 0 ];

            fileReader.onload = function (e) {

                var json = e.target.result,
                    session = JSON.parse(json);

                $("#igvSessionLoad").val("");

                $('#igvSessionLoadModal').modal('hide');

                browser.loadSession(session);

            };

            fileReader.readAsText(sessionFile);

        });

        // BED file upload
        document.getElementById('igvFileUpload').onchange = function (e) {

            browser.loadTrackFile($(this)[0]);

            $(this).val("");
            $('#igvFileUploadModal').modal('hide');
        };

        // BED URL upload
        document.getElementById('igvLoadURL').onchange = function (e) {

            browser.loadTrackPath($(this));

            $(this).val("");
            $('#igvLoadURLModal').modal('hide');
        };

        // Load ENCODE DataTables data and build markup for modal dialog.
        encode.createEncodeDataTablesDataSet("resources/peaks.hg19.txt", function (dataSet) {

            var encodeModalTable = $('#encodeModalTable'),
                myDataTable = encodeModalTable.dataTable({

                    "data": dataSet,
                    "scrollY": "400px",
                    "scrollCollapse": true,
                    "paging": false,

                    "columns": [

                        { "title": "cell" },
                        { "title": "dataType" },

                        { "title": "antibody" },
                        { "title": "view" },

                        { "title": "replicate" },
                        { "title": "type" },

                        { "title": "lab" },
                        { "title": "path" }
                    ]

                });

            encodeModalTable.find('tbody').on('click', 'tr', function () {

                if ($(this).hasClass('selected')) {

                    $(this).removeClass('selected');
                }
                else {

                    // Commenting this out enables multi-selection
//                    myDataTable.$('tr.selected').removeClass('selected');
                    $(this).addClass('selected');
                }

            });

            $('#encodeModalTopCloseButton').on('click', function () {
                myDataTable.$('tr.selected').removeClass('selected');

            });

            $('#encodeModalBottomCloseButton').on('click', function () {
                myDataTable.$('tr.selected').removeClass('selected');
            });

            $('#encodeModalGoButton').on('click', function () {

                var tableRow,
                    tableRows,
                    tableCell,
                    tableCells,
                    record = {};

                tableRows = myDataTable.$('tr.selected');

                if (0 < tableRows.length) {

                    tableRows.removeClass('selected');

                    for (var i = 0; i < tableRows.length; i++) {

                        tableRow = tableRows[ i ];
                        tableCells = $('td', tableRow);

                        tableCells.each(function () {

                            var key,
                                val,
                                index;

                            tableCell = $(this)[0];

                            index = tableCell.cellIndex;
                            key = encode.dataTableRowLabels[ index ];
                            //val = tableCell.innerText;
                            val = tableCell.innerHTML;

                            record[ key ] = val;

                        });

                        if (0 === browser.trackPanels.length) {

                            // When loading first track into app
                            // with no pre-exisiting tracks.
                            // set track as designated track
                            browser.initializeWithTrackConfig({
                                type: "bed",
                                url: record.path,
                                label: encode.encodeTrackLabel(record),
                                color: encode.encodeAntibodyColor(record.antibody),
                                designatedTrack: true
                            });

                        }
                        else {

                            browser.loadTrack({
                                type: "bed",
                                url: record.path,
                                label: encode.encodeTrackLabel(record),
                                color: encode.encodeAntibodyColor(record.antibody)
                            });

                        }


                    }

                }

            });

        });

        // Append resultant ENCODE DataTables markup
        $('#encodeModalBody').html('<table cellpadding="0" cellspacing="0" border="0" class="display" id="encodeModalTable"></table>');

        // Construct DOM hierarchy
        trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];
        browser = new igv.Browser(options, trackContainer);
        document.getElementById('igvContainerDiv').appendChild(browser.div);

        contentHeader = $('<div class="row"></div>')[0];
        $(browser.div).append(contentHeader);

        // horizontal scrollbar container. fill in the guts after track construction
        horizontalScrollBarContainer = $('<div class="igv-horizontal-scrollbar-container-div">')[0];
        $(browser.div).append(horizontalScrollBarContainer);

        // utility div
        thang = $('<div class="igv-utility-div">');
        $(browser.div).append(thang[0]);

        // control panel header
        thang.append($('<div class="igv-control-panel-header-div">Track Summary</div>')[0]);

        // track container
        $(browser.div).append(trackContainer);

        igv.addAjaxExtensions();

        // Add cursor specific methods to the browser object,  some new some overrides
        addBrowserCursorExtensions(browser);

        browser.cursorModel = new cursor.CursorModel(browser);
        browser.referenceFrame = new igv.ReferenceFrame("", 0, 1 / browser.cursorModel.framePixelWidth);

        browser.highlightColor = "rgb(204, 51, 0)";

        // Launch app with session JSON if provided as param
        var sessionJSONPath = igv.getQueryValue('session');

        if (sessionJSONPath) {

            $.getJSON(sessionJSONPath, function (session) {

                console.log("launchSession: " + JSON.stringify(browser.launchSession));
                browser.loadSession(session);

            });

        }
        else {

            if (undefined === options.tracks || 0 === options.tracks.length) {
                return;
            }

            browser.initializeWithOptions(options);

        }

        return browser;
    };

    function addBrowserCursorExtensions(browser) {

        browser.crossDomainProxy = "php/simpleProxy.php";

        browser.initializeWithTrackConfig = function (trackConfig) {

            var horizontalScrollBarContainer;

            browser.loadTrack(trackConfig);

            browser.selectDesignatedTrack(browser.designatedTrack.trackFilter.trackPanel);

            horizontalScrollBarContainer = $("div.igv-horizontal-scrollbar-container-div");
            browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(horizontalScrollBarContainer));

            browser.designatedTrack.featureSource.allFeatures(function (featureList) {

                browser.cursorModel.setRegions(featureList);

                browser.horizontalScrollbar.update();
            });

        };

        browser.initializeWithOptions = function (options) {

            var howmany,
                horizontalScrollBarContainer;

            howmany = 0;
            options.tracks.forEach(function (trackConfig) {

                browser.loadTrack(trackConfig);

                if (++howmany === options.tracks.length) {

                    browser.selectDesignatedTrack(browser.designatedTrack.trackFilter.trackPanel);

                    horizontalScrollBarContainer = $("div.igv-horizontal-scrollbar-container-div");
                    browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(horizontalScrollBarContainer));

                    browser.designatedTrack.featureSource.allFeatures(function (featureList) {

                        browser.cursorModel.setRegions(featureList);

                        browser.horizontalScrollbar.update();
                    });

                }
            });

        };

        browser.presentSortStatus = function (trackView) {

            $(trackView.track.sortButton).addClass("igv-control-sort-fontawesome-selected");

            $(browser.trackContainerDiv).find("i.fa-signal").each(function() {

                var me = $(this);

                if (1 === browser.sortDirection) {
                    me.addClass("fa-flip-horizontal");
                } else {
                    me.removeClass("fa-flip-horizontal");
                }

            });

        };

        browser.selectDesignatedTrack = function (trackView) {

            var currentDesignatedTrackView,
                bullseyeInner,
                bullseyeOuter,
                trackLabelDiv;

            if (browser.designatedTrack && browser.designatedTrack.trackFilter.trackPanel !== trackView) {

                currentDesignatedTrackView = browser.designatedTrack.trackFilter.trackPanel;

                bullseyeInner = $(currentDesignatedTrackView.trackDiv).find("i.fa-circle");
                bullseyeInner.removeClass("igv-control-bullseye-fontawesome-selected");
                bullseyeInner.addClass   ("igv-control-bullseye-fontawesome");

                bullseyeOuter = $(currentDesignatedTrackView.trackDiv).find("i.fa-circle-thin");
                bullseyeOuter.removeClass("igv-control-bullseye-fontawesome-selected");

                trackLabelDiv = $(currentDesignatedTrackView.trackDiv).find("div.igv-track-label-div");
                trackLabelDiv.removeClass("igv-track-label-selected-div");

            }

            browser.designatedTrack = trackView.track;

            bullseyeInner = $(trackView.trackDiv).find("i.fa-circle");
            bullseyeInner.removeClass("igv-control-bullseye-fontawesome");
            bullseyeInner.addClass   ("igv-control-bullseye-fontawesome-selected");

            bullseyeOuter = $(trackView.trackDiv).find("i.fa-circle-thin");
            bullseyeOuter.addClass("igv-control-bullseye-fontawesome-selected");


            //bullseyeInner.css({
            //    "color" : browser.highlightColor
            //});

            trackLabelDiv = $(trackView.trackDiv).find("div.igv-track-label-div");
            trackLabelDiv.addClass("igv-track-label-selected-div");

        };

        browser.setFrameWidth = function (frameWidthString) {

            if (!igv.isNumber(frameWidthString)) {
                console.log("bogus " + frameWidthString);
                return;
            }

            var frameWidth = parseFloat(frameWidthString);
            if (frameWidth > 0) {

                browser.cursorModel.framePixelWidth = frameWidth;
                browser.referenceFrame.bpPerPixel = 1 / frameWidth;

                $("input[id='frameWidthInput']").val(frameWidthNumberFormatter(frameWidth));

                browser.update();
            }


        };

        browser.setRegionSize = function (regionSizeString) {

            var regionSize = parseFloat(regionSizeString);
            if (regionSize > 0) {

                browser.cursorModel.regionWidth = regionSize;
                $("input[id='regionSizeInput']").val(browser.cursorModel.regionWidth);

                browser.cursorModel.filterRegions();
            }

        };

        browser.zoomIn = function () {

            browser.setFrameWidth(2.0 * browser.cursorModel.framePixelWidth);
            browser.update();
        };

        browser.zoomOut = function () {

            var thresholdFramePixelWidth = browser.trackViewportWidth() / browser.cursorModel.regionsToRender().length;

            browser.setFrameWidth(Math.max(thresholdFramePixelWidth, 0.5 * browser.cursorModel.framePixelWidth));

            browser.update();
        };

        browser.fitToScreen = function () {

            var frameWidth;

            if (!(browser.cursorModel && browser.cursorModel.regions)) {
                return;
            }

            if (browser.cursorModel.regionsToRender().length > 0) {
                frameWidth = browser.trackViewportWidth() / browser.cursorModel.regionsToRender().length;
                browser.referenceFrame.start = 0;
                browser.setFrameWidth(frameWidth);
            }
        };

        browser.trackContentWidth = function () {

            var width;

            if (this.trackPanels && this.trackPanels.length > 0) {
                width = this.trackPanels[0].contentDiv.clientWidth;
            }
            else {
                width = this.trackContainerDiv.clientWidth;
            }

            return width;

        };

        // Augment standard behavior of resize
        browser.resize = function () {

            var ratio;

            if (!browser.horizontalScrollbar) {

                this.__proto__.resize.call(this);
            }
            else {

                ratio = browser.cursorModel.framePixelWidth / browser.trackContentWidth();

                this.__proto__.resize.call(this);

                //browser.cursorModel.framePixelWidth = ratio * browser.trackContentWidth();
                //browser.referenceFrame.bpPerPixel = 1.0 / browser.cursorModel.framePixelWidth;
                //
                //$("input[id='frameWidthInput']").val(frameWidthNumberFormatter(browser.cursorModel.framePixelWidth));

                browser.setFrameWidth( ratio * browser.trackContentWidth() );
                browser.horizontalScrollbar.update();
            }

        };

        // Augment standard behavior of removeTrack
        browser.removeTrack = function (track) {

            this.__proto__.removeTrack.call(this, track);

            if (track === this.designatedTrack) {
                this.designatedTrack = undefined;
            }

            this.cursorModel.filterRegions();

        };

        // Alter "super" implementation
        browser.loadTrack = function (config) {

            if (browser.isDuplicateTrack(config)) {
                return;
            }

            var path = config.url,
                type = config.type,
                newTrack;

            if (!type) {
                type = cursorGetType(path);
            }

            if (type !== "bed") {
                window.alert("Bad Track type");
                return;

            }

            newTrack = new cursor.CursorTrack(config, browser);

            if (true === config.designatedTrack) {
                browser.designatedTrack = newTrack;
            }

            browser.addTrack(newTrack);

            function cursorGetType(path) {

                if (path.endsWith(".bed") || path.endsWith(".bed.gz") || path.endsWith(".broadPeak") || path.endsWith(".broadPeak.gz")) {
                    return "bed";
                } else {
                    return undefined;
                }

            }

        };

        browser.loadTrackFile = function (fileInput) {

            var localFile,
                localFiles = fileInput.files;

            for (var i = 0; i < localFiles.length; i++) {

                localFile = localFiles[ i ];

                if (0 === browser.trackPanels.length) {

                    // When loading first track into app
                    // with no pre-exisiting tracks.
                    // set track as designated track
                    browser.initializeWithTrackConfig({
                        type: "bed",
                        localFile: localFile,
                        url: undefined,
                        label: localFile.name,
                        designatedTrack: true
                    });

                }
                else {

                    browser.loadTrack({
                        type: "bed",
                        localFile: localFile,
                        url: undefined,
                        label: localFile.name
                    });

                }

                localFiles[ i ] = undefined;

            }

        };

        browser.loadTrackPath = function (elementObject) {

            var path = elementObject.val();

            elementObject.val("");


            if (0 === browser.trackPanels.length) {

                // When loading first track into app
                // with no pre-exisiting tracks.
                // set track as designated track
                browser.initializeWithTrackConfig({
                    type: "bed",
                    url: path,
                    label: browser.trackLabelWithPath(path),
                    designatedTrack: true
                });

            }
            else {

                browser.loadTrack({
                    type: "bed",
                    url: path,
                    label: browser.trackLabelWithPath(path)
                });

            }



        };

        browser.session = function () {

            var dev_null,
                session =
                {
                    start: Math.floor(browser.referenceFrame.start),
                    end: Math.floor((browser.referenceFrame.bpPerPixel * browser.trackViewportWidth()) + browser.referenceFrame.start),
                    regionWidth: browser.cursorModel.regionWidth,
                    framePixelWidthUnitless: (browser.cursorModel.framePixelWidth / browser.trackViewportWidth()),
                    trackHeight: browser.trackHeight,
                    tracks: []
                };

            dev_null = browser.trackViewportWidth();

            browser.trackPanels.forEach(function (trackView) {

                var jsonRepresentation = trackView.track.jsonRepresentation();

                if (jsonRepresentation) {

                    if (browser.designatedTrack && browser.designatedTrack === trackView.track) {
                        jsonRepresentation.designatedTrack = true;
                    }

                    session.tracks.push(jsonRepresentation);
                }
                else {
                    // TODO -- what if there is no json repesentation?
                }
            });

            return JSON.stringify(session, undefined, 4);

        };

        browser.sessionTeardown = function () {

            var trackView,
                horizontalScrollBarContainer;

            while (this.trackPanels.length > 0) {
                trackView = this.trackPanels[ this.trackPanels.length - 1 ];
                this.removeTrack(trackView.track);
            }

            horizontalScrollBarContainer = $("div.igv-horizontal-scrollbar-container-div");
            $(horizontalScrollBarContainer).empty();

            this.horizontalScrollbar = undefined;

        };

        browser.loadSession = function (session) {

            var cursorTracks,
                howmany,
                horizontalScrollBarContainer;


            browser.sessionTeardown();

            browser.cursorModel.regionWidth = session.regionWidth;
            $("input[id='regionSizeInput']").val(browser.cursorModel.regionWidth);

            browser.trackHeight = session.trackHeight;
            $("input[id='trackHeightInput']").val(browser.trackHeight);

            cursorTracks = [];
            browser.designatedTrack = undefined;
            session.tracks.forEach(function (trackSession) {

                var cursorTrack,
                    config = {
                        type: "bed",
                        url: trackSession.path,
                        color: trackSession.color,
                        label: trackSession.label,
                        order: trackSession.order,
                        trackHeight: trackSession.height,
                        trackFilter: trackSession.trackFilter,
                        designatedTrack: trackSession.designatedTrack
                    };

                cursorTrack = new cursor.CursorTrack(config, browser);
                if (undefined !== config.designatedTrack && true === config.designatedTrack) {
                    browser.designatedTrack = cursorTrack;
                }

                cursorTracks.push(cursorTrack);

            });

            if (undefined === browser.designatedTrack) {
                browser.designatedTrack = cursorTracks[ 0 ];
            }

            howmany = 0;
            cursorTracks.forEach(function (cursorTrack) {

                browser.addTrack(cursorTrack);

                if (++howmany === cursorTracks.length) {

                    browser.selectDesignatedTrack(browser.designatedTrack.trackFilter.trackPanel);

                    horizontalScrollBarContainer = $("div.igv-horizontal-scrollbar-container-div");
                    browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(horizontalScrollBarContainer));

                    browser.designatedTrack.featureSource.allFeatures(function (featureList) {

                        browser.cursorModel.setRegions(featureList);

                        browser.setFrameWidth(browser.trackViewportWidth() * session.framePixelWidthUnitless);

                        browser.referenceFrame.bpPerPixel = 1.0 / browser.cursorModel.framePixelWidth;

                        //browser.goto("", session.start, session.end);
                        browser.fitToScreen();


                        browser.horizontalScrollbar.update();


                    });
                }

            });

        };

        function frameWidthNumberFormatter(frameWidth) {

            var divisor;

            if (frameWidth < 1) {

                divisor = 1000;
            } else if (frameWidth < 100) {

                divisor = 100;
            } else {

                divisor = 10;
            }

            return Math.round(frameWidth * divisor) / divisor;
        }

    }

    return igv;

})(igv || {});