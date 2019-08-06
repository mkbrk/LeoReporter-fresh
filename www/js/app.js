
var app = {
    initialize: function() {
        document.addEventListener('deviceready', function() {
            //start-up code in here...
            $.support.cors = true;
            app.showPage("about-page");
        }, false);
    },
    showingPage : function(id) {
        //use this to run some code upon showing a page
        if(id == "make-observation-page")
        {
            observing.startObservation();
        }
        else if(id == "settings-page")
        {
            $("#pendingObservationsCount").html(observing.listPendingObservationKeys().length);

            if(app.isSignedIn())
            {
                $("#signOutButton").show();
                $("#signInButton").hide();
            }
            else
            {
                $("#signOutButton").hide();
                $("#signInButton").show();
            }
        }
        else if(id == "outbox-page")
        {
            var c = $("#pendingObservations");
            c.html("");
            var h = "";
            var keys = observing.listPendingObservationKeys();
            for (var i = 0; i < keys.length; i++) {
                h += "<div>" + keys[i] + "</div>";
            };

            c.html(h);
        }
    },
    getRemoteUrl : function(path) {
        //TODO: get the URL root from config file
        //return "https://www.leonetwork.org" + path;
        return "https://leonetwork-staging.azurewebsites.net" + path; //maybe a cert issue? - nope
    },
    showPage: function(id)
    {
        $(".page").hide();
        var page = $("#" + id);
        if(page.hasClass("authenticate") && !app.isSignedIn())
            app.showPage("sign-in-page");
        else
        {
            app.showingPage(id);
            page.show();            
        }
        
        $('.navbar-collapse').collapse('hide');
    },
    getToken : function() {
        var storage = window.localStorage;
        return storage.getItem("TOKEN");  
    },
    isSignedIn : function() {
        var storage = window.localStorage;
        var token = storage.getItem("TOKEN");  
        if(token && token != null)
            return true;
        else
            return false;
    },
    signIn : function() {
        app.showPage("sign-in-page");
    },
    signOut : function() {
        var storage = window.localStorage;
        var token = storage.removeItem("TOKEN");  
        app.showPage("settings-page");
    },
    postJson : function(url, data, callback) {
        var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
        xmlhttp.addEventListener("load", function() {
            if(callback)
                callback(JSON.parse(this.responseText));
        });
        xmlhttp.open("POST", url);
        xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.send(JSON.stringify(data));
    },
    doSignIn: function() {
        var email = $("#sign-in-page").find("[name=LoginName]").val();
        var pwd = $("#sign-in-page").find("[name=Password]").val();

        var postMe = JSON.stringify({LoginName:email, Password:pwd});

        $.post(app.getRemoteUrl("/en/members/remoteauth"), postMe, function(res) {
            if(res.Status == "OK")
            {
                var token = res.Token;
                var storage = window.localStorage;
                storage.setItem("TOKEN", token);    
                app.showPage("make-observation-page");        
            }
            else
            {
                $("#sign-in-page").find("[name=Password]").val("");
                navigator.notification.alert(res.Message, null, "Error", "OK");
            }
        }, "json");

        return;

        app.postJson(app.getRemoteUrl("/en/members/remoteauth"), {LoginName:email, Password:pwd}, function(res) {
            if(res.Status == "OK")
            {
                var token = res.Token;
                var storage = window.localStorage;
                storage.setItem("TOKEN", token);    
                app.showPage("make-observation-page");        
            }
            else
            {
                $("#sign-in-page").find("[name=Password]").val("");
                navigator.notification.alert(res.Message, null, "Error", "OK");
            }
        });

        return;

        

        //$.ajax({
        //    type: "POST",
        //    url: app.getRemoteUrl("/en/members/remoteauth"),
        //    dataType: "json",
        //    data: JSON.stringify({LoginName:email, Password:pwd}),
        //    success: function(data) {
        //        console.log(data);
        //        res = JSON.parse(data);

        //        var token = res.Token;
        //        var storage = window.localStorage;
        //        storage.setItem("TOKEN", token);    
        //        app.showPage("make-observation-page");    
        //    },
        //    error: function(e) {
        //        $("#sign-in-page").find("[name=Password]").val("");
        //        navigator.notification.alert(e.Message, null, "Error", "OK");
        //    }
        // });

        
    }
};
