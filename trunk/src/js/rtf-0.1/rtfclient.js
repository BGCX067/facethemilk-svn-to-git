(function() {
    
	
    var rtfClient = dojo.provide('rtf.rtfclient');
    dojo.require('dojox.collections.Dictionary');
    dojo.require('dojox.json.query');
    dojo.require("dojox.encoding.digests.MD5");
    dojo.require("dojo.data.ItemFileWriteStore");
    dojo.require("dojox.grid.DataGrid");
    dojo.require("dojo.date.locale");
    dojo.require("dojox.grid.cells.dijit");

    
    //shortcuts
    var ded=dojox.encoding.digests;
	
    
    //global variables
    rtfClient.global = {
        token: new String(),
        userId: new String(),
        sessionKey: new String(),
        params: []
    };
   
    // Facebook client logic
    rtfClient.FBClient = {

        //Mehtod call URL
        methurl: "http://api.facebook.com/restserver.php",
        authURL: "http://api.facebook.com/login.php",
        sharedSecret: "eceaa5941dce4cf23f5855b954611d84",
        apiKey: "9ed82ea8f0af77ee68e7b203f2802599",
        callCounter: 0,

        
        //make FB Method requests
        fbAuthCall: function(data) {
            if(typeof(data) != "object") throw("Need a data object");
            if(typeof(data.method) == "undefined") throw("Need a method name");

            data.api_key = this.apiKey;
            data.format = "JSON";
            data.call_id = this.callCounter++;
            data.v = "1.0";
            //if (typeof(token) != "undefined") data.auth_token = token;
            //if (typeof(timeline) != "undefined") data.timeline = timeline;
            this.fbSign(data);

            dojo.io.script.get({
                url: this.authURL,
                content: data
            });
        },

        //make FB Auth requests
        fbCall: function(data) {
            if(typeof(data) != "object") throw("Need a data object");
            if(typeof(data.method) == "undefined") throw("Need a method name");

            data.api_key = this.apiKey;
            data.format = "JSON";
            data.call_id = this.callCounter++;
            data.v = "1.0";
            //if (typeof(token) != "undefined") data.auth_token = token;
            //if (typeof(timeline) != "undefined") data.timeline = timeline;
            this.fbSign(data);

            dojo.io.script.get({
                url: this.methurl,
                content: data
            });
        },

        //sign rtm requests
        fbSign: function(args) {
            var ded=dojox.encoding.digests;
            
        	
            var arr = [];
            var str = "";

            for (var e in args) arr.push(e);
            arr.sort();


            for (var i=0;i<arr.length;i++) {
                if (typeof args[arr[i]] != 'undefined') str+=arr[i]+"=" +args[arr[i]];
            }
            var sig = ded.MD5(str+this.sharedSecret, ded.outputTypes.Hex);
            args.sig = sig;
        },


        createTokenObject: function(data) {
            rtfClient.global.token = dojox.json.query('rsp.auth.token', data);
            rtf.rtfclient.FBClient.fbCall({
                callback: 'rtf.rtfclient.FBClient.setProps',
                method: 'Data.createObject',
                obj_type: 'rtm_token'
            });
        },


        getSession: function(response){
            this.fbAuthCall({
                method: 'Auth.getSession',
                auth_token: response,
                callback: 'rtf.rtfclient.Util.publishFBSession'
            });
        },

        setProps: function(data) {
            var obj_id = data;
            
            this.fbCall({
                method: 'Data.setObjectProperty',
                obj_id: data,
                prop_name: "token",
                prop_value: rtfClient.global.token
            });

            this.fbCall({
                method: 'Data.setObjectProperty',
                obj_id: data,
                prop_name: "userid",
                prop_value: rtfClient.global.userId
            });
            this.setAssociation('user_to_token', rtfClient.global.userId, obj_id, rtfClient.global.token,'rtf.rtfclient.FBClient.checkErrorOnTokenSave');
            rtfClient.Util.publishToken([{
                data: rtfClient.global.token
            }]);
        },

        checkErrorOnTokenSave: function(data){
            if(dojo.isObject(data)) {
                var obj_id_array = dojox.json.query("?key='obj_id2'", data.request_args);
                var obj_id = obj_id_array[0];
                this.fbCall({
                    method: 'Data.removeAssociatedObjects',
                    name: 'user_to_token',
                    obj_id: rtfClient.global.userId,
                    data: rtfClient.global.token
                });
                this.setAssociation('user_to_token', rtfClient.global.userId, obj_id.value, rtfClient.global.token);

            }
        },

        getAssociatedObject: function(name,callback){
            rtf.rtfclient.FBClient.fbCall({
                callback: callback,
                session_key: rtf.rtfclient.global.sessionKey,
                obj_id: rtf.rtfclient.global.userId,
                method: 'Data.getAssociatedObjects',
                name: name,
                no_data: false
            });
        },

        setAssociation: function(association, obj1, obj2, data, callback) {
            this.fbCall({
                callback: callback,
                method: 'Data.setAssociation',
                name: association,
                obj_id1: obj1,
                obj_id2: obj2,
                data: data
            });

        },


        showFBAuthLink: function(){

            var params = '5a3c1b2ba103923dapi_key9b4270b8978576b632d40e4388d933cdpermsdelete';
            var signature = ded.MD5(params, ded.outputTypes.Hex);
            var authURL = "http://www.facebook.com/login.php?v=1.0&api_key=9ed82ea8f0af77ee68e7b203f2802599&next=http://apps.facebook.com/facethemilk&canvas=";
            var authLinkContainer = dojo.byId("authURLDiv");
            var authHelpText = document.createElement("div");
            authHelpText.innerHTML = "<span style=\"font-weight:bold;\"> You must authorize this application to access your Remembter The Milk tasks.</span><br/>\n\
                        <span style=\"font-size:smaller;\">We use Facebook as a data store, but we can only do this for you, if you trust us. \n\
                        Our code is fully available as Open Source. You can double check that we don't do anything wrong.<br/>\n\
                        Please click the following link to be forwarded to the Authoirzation page where you can authorize FaceTheMilk for your profile:</span><br/>";
            var authLink = document.createElement("a");
            dojo.attr(authLink,"href",authURL);
            dojo.attr(authLink,"target","_parent");
            authLink.innerHTML = authURL;
            dojo.place(authHelpText,authLinkContainer,"last");
            dojo.place(authLink,authLinkContainer,"last");
        }

    };
    rtfClient.RTMClient = {
        // dojo.require('dojox.json.query');
        // dojo.require("dojox.encoding.digests.MD5");
        // dojo.require("dojo.data.ItemFileWriteStore");
        // dojo.require("dojo.date.locale");
        //dojo.require("dojox.grid.cells.dijit");


        token: '',
        //Mehtod call URL
        methurl: "http://api.rememberthemilk.com/services/rest/",
        //Auth call URL
        authurl: "http://www.rememberthemilk.com/services/auth/",

        sharedSecret: "5a3c1b2ba103923d",
        apiKey: "9b4270b8978576b632d40e4388d933cd",
        taskListStore: null,

        //make rtm requests
        rtmCall: function(data) {
            if(typeof(data) != "object") throw("Need a data object");
            if(typeof(data.method) == "undefined") throw("Need a method name");

            data.api_key = this.apiKey;
            data.format = "json";
            //if (typeof(token) != "undefined") data.auth_token = token;
            //if (typeof(timeline) != "undefined") data.timeline = timeline;
            this.rtmSign(data);

            dojo.io.script.get({
                url: this.methurl,
                content: data
            });
        },


        //sign rtm requests
        rtmSign: function(args) {
            var arr = [];
            var str = this.sharedSecret;

            for (var e in args) arr.push(e);
            arr.sort();


            for (var i=0;i<arr.length;i++) str+=arr[i]+args[arr[i]];
            var sig = ded.MD5(str, ded.outputTypes.Hex);
            args.api_sig = sig;
        },
        
        getTaskList: function(token) {
            this.rtmCall({
                callback: 'rtf.rtfclient.RTMClient.parseListResponse',
                filter: 'status:incomplete',
                method: 'rtm.tasks.getList',
                auth_token: token
            });
        },

        parseListResponse: function(data) {
            if (dojox.json.query('err',data.rsp) ) {
                this.showRTMAuthLink();
            } else {
                this.taskListStore = new dojo.data.ItemFileWriteStore({
                    data:{
                        identifier: "id",
                        label: "name",
                        items: []
                    }
                });
                
                var lists = dojox.json.query('list',data.rsp.tasks);
                dojo.forEach(lists, function(list) {
                    var taskseries = dojox.json.query("taskseries",list);
                    if (!dojo.isArray(taskseries)) {
                        rtfClient.RTMClient.taskListStore.newItem({
                            "id": taskseries.id,
                            "name": taskseries.name,
                            "due": rtfClient.Util.dateFromISO8601String(taskseries.task.due)
                        });
                    } else {
                        dojo.forEach(taskseries, function(task) {
                            rtfClient.RTMClient.taskListStore.newItem({
                                "id": task.id,
                                "name": task.name,
                                "due": rtfClient.Util.dateFromISO8601String(task.task.due)
                            });
                        });
                    }
                });
                var taskGridLayout = {cells: [
                {
                    field: 'id',
                    name: 'Id',
                    hidden: true
                },

                {
                    field: 'name',
                    name: 'Name',
                    width: 'auto',
                    editable: true,
                    editorProps: {required:true}
                },

                {
                    field: 'due',
                    name: 'Due Date',
                    width: '100px',
                    editable: true,
                    type: dojox.grid.cells.DateTextBox,
                    formatter: function(date) {
                        if (date) {
                            return dojo.date.locale.format(date, {
                                selector: "date",
                                formatLength: "short"
                            });
                        } else {
                            return null;
                        }
                    }
                }
                ]};

                // create a new grid:
                var taskGrid = new dojox.grid.DataGrid({
                    query: {
                        id: '*'
                    },
                    store: this.taskListStore,
                    clientSort: true,
                    rowSelector: '20px',
                    structure: [taskGridLayout]
                }, document.createElement('div'));

                // append the new grid to the div "gridContainer4":
                dojo.byId("tasks").appendChild(taskGrid.domNode);

                // Call startup, in order to render the grid:
                taskGrid.startup();

            }
        },

          
            
        showRTMAuthLink: function(){
            	
            var params = '5a3c1b2ba103923dapi_key9b4270b8978576b632d40e4388d933cdpermsdelete';
            var signature = ded.MD5(params, ded.outputTypes.Hex);
            var authURL = 'http://www.rememberthemilk.com/services/auth/?api_key=9b4270b8978576b632d40e4388d933cd&perms=delete&api_sig='+signature;
            var authLinkContainer = dojo.byId("authURLDiv");
            var authHelpText = document.createElement("div");
            authHelpText.innerHTML = "<span style=\"font-weight:bold;\"> Please click the link below to authentice FaceTheMilk.</span><br/>\n\
                        <span style=\"font-size:smaller;\">This link will bring you to a RememberTheMilk. There you can chose to authorize FaceTheMilk. \n\
                        As soon as you did so, you sold your soul to us. <EVIL LAUGHTER>HAHAHA</EVIL LAUGHTER>...<br/>\n\
                        Just kidding. You will be redirected to FaceTheMilk where you then access your RememberTheMilk tasks.</span><br/>";
            var authLink = document.createElement("a");
            dojo.attr(authLink,"href",authURL);
            dojo.attr(authLink,"target","_parent");
            authLink.innerHTML = authURL;
            dojo.place(authHelpText,authLinkContainer,"last");
            dojo.place(authLink,authLinkContainer,"last");
        }
    };

    rtfClient.Util = {
        // dojo.require('dojox.collections.Dictionary');
   
        // fire event that token is set
        publishToken: function(response) {
            // TODO add logic to identify a FB auth error (e.g. session key not valid anymore
            if (dojo.isString(dojox.json.query('error_msg',response))) {
                rtf.rtfclient.FBClient.showFBAuthLink();
            } else {
                var token = dojox.json.query('data', response[0]);
                if (dojo.isString(token)) {
                    rtfClient.global.token = token;
                    dojo.publish('RTMToken', [token]);
                } else {
                    console.log('Show the auth link');
                    rtfClient.RTMClient.showRTMAuthLink();
                }
            }
        	
        },

        publishFBSession: function(response){
            rtfClient.global.sessionKey = dojox.json.query('session_key', respsonse);
            rtfClient.global.userId = dojox.json.query('uid', respsonse);
            if(rtfClient.global.sessionKey && rtfClient.global.sessionKey != '') {
                dojo.publish('FBSession', []);
            }

        },

        getAndStoreToken: function(frob) {
            rtf.rtfclient.RTMClient.rtmCall({
                callback: 'rtf.rtfclient.FBClient.createTokenObject',
                frob: frob,
                method: 'rtm.auth.getToken'
            });
        },
        


        createNode: function(tag, className){
            var newNode= document.createElement(tag);
            dojo.addClass(newNode, className);
            return newNode;
        },

        parseParams: function(){
            var paramString = location.href.split("?")[1];
            var params = paramString.split("&");
            var paramMap = new dojox.collections.Dictionary();
            dojo.forEach(params, function(e) {
                paramMap.add(e.split("=")[0],e.split("=")[1]);
            });
            return paramMap;
        },


        dateFromISO8601String: function(string) {
            if (string) {
                return dojo.date.stamp.fromISOString(string);
            } else {
                return null;
            }
        }
    };
})();