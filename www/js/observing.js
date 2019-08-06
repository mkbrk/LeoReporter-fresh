var observing = {
	currentObservation : null,
	categories : null,

	initialize : function() {
		//load the categories
		$.get("data/categories.json", null, function(res) {
			observing.categories = res;
			var template = $("#category-block-template").html();
			Mustache.parse(template);
			var html = [];
			for (var i = 0; i < res.length; i++) {
				html.push(Mustache.render(template, res[i]));
			};
			$("#categories").html(html.join(""));
		}, "json");

		//sets up fields to keep the currentObservation object up to date
		$(".observation-page").find("input,textarea").change(function (e) {
                var t = e.target;
                var id = t.id;
                var name = $(t).attr("name");

                if (name)
                {
                    if (name.indexOf("Caption") == 0) {
                        var num = parseInt(name.replace("Caption_", ""));
                        if (!isNaN(num) && observing.currentObservation.Attachments.length > num)
                            observing.currentObservation.Attachments[num].Caption = $(t).val();
                    }
                    else if (name == "CategoryID") {
                        var checkedCats = $("input[name=CategoryID]:checked");
                        observing.currentObservation.Categories = [];
                        checkedCats.each(function () {
                            observing.currentObservation.Categories.push($(this).val());
                        });
                    }
                    else {
                        observing.currentObservation[name] = $(t).val();
                    }
                }
            });

		//defer this a little bit
		//behaves a little strange otherwise - jquery triggers a preflight OPTIONS on teh ajax call
		window.setTimeout(observing.syncNextObservation, 20 * 1000);
	},

	startObservation : function()
        {
            if ("geolocation" in navigator) {
                $("#geolocation-area").show();
            } else {
                $("#geolocation-area").hide();
            }

            var cached = window.localStorage.getItem("CURRENTOBSERVATION");

            if (cached != null) {
                observing.showPage("continue-page");
            }
            else {
                observing.newObservation();
            }
        },

        abandonCurrentObservation : function() {
        	navigator.notification.confirm("Are you sure?", function(btn) {
        		if(btn == 1)
	        		observing.newObservation();
        	});
        },

        newObservation : function() {
            window.localStorage.removeItem("CURRENTOBSERVATION");

            $("#ObservationDate").val(moment().format("YYYY-MM-DD"));

            observing.currentObservation = {
                ObservationTitle: null,
                ObservationDate: moment().format("YYYY-MM-DD"),
                ObservationDescription: null,
                LocationLat: null,
                LocationLng: null,
                Categories: [],
                Attachments: []
            };

            observing.scatter(observing.currentObservation);
            observing.showPage("headline-page", true);
        },

        continueObservation : function() {
            var cached = window.localStorage.getItem("CURRENTOBSERVATION");
            observing.currentObservation = JSON.parse(cached);

            observing.scatter(observing.currentObservation);

            observing.showPage("headline-page", true);
        },

        showPage : function(id, nosave)
        {
            //sets the cached observation

            if(observing.currentObservation != null && nosave != true)
                window.localStorage.setItem("CURRENTOBSERVATION", JSON.stringify(observing.currentObservation));

            $(".observation-page").hide();
            $("#" + id).fadeIn();
        },

        getCurrentLocation : function()
        {
            navigator.geolocation.getCurrentPosition(function (position) {
                $("#LocationLat").val(position.coords.latitude);
                $("#LocationLng").val(position.coords.longitude);
                observing.currentObservation.LocationLat = position.coords.latitude;
                observing.currentObservation.LocationLng = position.coords.longitude;
                $("#currentLocation").html(position.coords.latitude + "," + position.coords.longitude);
            });
        },

        addPhoto : function(num) {
			navigator.camera.getPicture(function(imgData) {
				var img = document.getElementById('Image_' + num);
                img.src = imgData;

                observing.currentObservation.Attachments[num] = {
                    Data: imgData,
                    Caption: null
                };

                $("#Image_" + num).show();
                $("#Caption_" + num).show();
                $("#Remove_" + num).show();
                    
			}, function(errorMsg) {
				navigator.notification.alert(errorMsg, null, "Error", "OK");
			}, {});
        },

        removePhoto : function(i) {
            var n = parseInt(i);
            if (!isNaN(n) && observing.currentObservation.Attachments.length > 0) {
                observing.currentObservation.Attachments[n] = null;
            }


            $("#Image_" + i).attr("src", null).hide();
            $("#Caption_" + i).hide();
            $("#Remove_" + i).hide();
        },

        saveObservation : function(asdraft)
        {
            //TODO: make sure everything is filled out
            var rand = 1000 * Math.random();
            var key = "OBSERVATION_" + rand;
            observing.currentObservation.SaveAsDraft = asdraft;
            window.localStorage.setItem(key, JSON.stringify(observing.currentObservation));
            window.localStorage.removeItem("CURRENTOBSERVATION");
            observing.currentObservation = null;
            observing.showPage("thanks-page");

        },

        clearPendingObservations : function(callback) {
        	var keys = observing.listPendingObservationKeys();
        	for (var i = 0; i < keys.length; i++) {
        		window.localStorage.removeItem(keys[i]);
        	};
        	if(callback)
        		callback();
        },

        syncObservation : function (key)
        {
			if (app.isSignedIn() && navigator.onLine) {
				var val = window.localStorage.getItem(key);
				if(val && val != null)
				{
					$.ajax({
                    	url: app.getRemoteUrl("/en/offline/sync"),
                    	method: "POST",
                    	contentType: "text/plain",
                    	dataType: "text",
                    	data: val,
                    	headers: {
                    		"x-leo-header": app.getToken()
                    	}, 
                    	success : function (res) {
                            if (res == "OK") { //synced - delete it
                                window.localStorage.removeItem(key);
                                console.log("synched observation: " + key);
                            }
                            else
                                console.log(res);
                            window.setTimeout(observing.syncNextObservation, 1000 * 5); 
                        }
                    });
				}
                
            }
        },

        listPendingObservationKeys : function() {
        	var keys = [];

			for (var i = 0; i < window.localStorage.length; i++) {
                var key = window.localStorage.key(i);
                if (key.indexOf("OBSERVATION_") == 0) {
                	keys.push(key);
                }
            }

        	return keys;
        },

        syncNextObservation : function() {
        	var synching = false;
            if (app.isSignedIn() && navigator.onLine) {
                for (var i = 0; i < window.localStorage.length; i++) {
                    var key = window.localStorage.key(i);
                    if (key.indexOf("OBSERVATION_") == 0) {
                    	synching = true;
                        observing.syncObservation(key);
                    }
                }
            }

            if(!synching) //check in another minute if nothing to synch
				window.setTimeout(observing.syncNextObservation, 1000 * 60);             	
        },

        scatter : function(obj)
        {
            $("input,textarea").each(function () {
                var name = $(this).attr("name");
                if (name != "CategoryID") {
                    $(this).val(obj[name]);
                }
            });


            //special processing for lat/lng
            if (obj.LocationLat && obj.LocationLng)
                $("#currentLocation").html(obj.LocationLat + "," + obj.LocationLng);
            else
                $("#currentLocation").html("");

            //special processing for categories
            var catCheckers = $("input[name=CategoryID]");
            catCheckers.each(function () {
                var val = $(this).val();
                $(this).prop("checked", false);
                if (obj.Categories != null && obj.Categories.length > 0)
                {
                    for (var i = 0; i < obj.Categories.length; i++) {
                        if(val == obj.Categories[i])
                            $(this).prop("checked", true);
                    }
                }                    
            });

            //special processing for photos
            if(obj.Attachments && obj.Attachments.length > 0)
            {
                for (var i = 0; i < obj.Attachments.length; i++) {
                    var att = obj.Attachments[i];
                    if(att.Data && att.Data != null)
                    {
                        var canvas = document.getElementById('Canvas_' + i);
                        var ctx = canvas.getContext('2d');

                        var img = new Image;
                        img.onload = function () {
                            ctx.drawImage(img, 0, 0); // Or at whatever offset you like
                        };
                        img.src = att.Data;

                        $("#Canvas_" + i).show();
                        $("#Caption_" + i).show().val(att.Caption);
                        $("#Remove_" + i).show();
                    }
                }
            }
        }

};