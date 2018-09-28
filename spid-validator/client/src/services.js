import axios from "axios";
import Utility from "./utility";


class MainService {

	constructor() {
		this.mainService = null;
		Utility.log("SERVICES", "CREATED");
	}

	static getMainService() {
		if(this.mainService==null) 
			this.mainService = new MainService()

		return this.mainService;
	}

	authenticate(options, callback_response, callback_error) {
		Utility.log("GET /authenticate");
		axios.get('/authenticate?user=' + options.user + '&password=' + options.password)
		.then(function (response) {
			callback_response(response.data.apikey);
		})
		.catch(function (error) {
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}	

	getInfo(callback_response, callback_error) {
		Utility.log("GET /api/info");
		axios.get('/api/info')
		.then(function(response) {
			Utility.log("getInfo Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getInfo Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
    }
	

	loadWorkspace(callback_response, callback_error) {
		Utility.log("GET /api/store");
		axios.get('/api/store')
		.then(function(response) {
			Utility.log("loadWorkspace Success", response.data);
            callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("loadWorkspace Error", error.response.data);
            callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	saveWorkspace(data) {
		Utility.log("POST /api/store", data);
		axios.post('/api/store', data)
		.then(function(response) {
			Utility.log("saveWorkspace Success", response.data);
		})
		.catch(function(error) {
			Utility.log("saveWorkspace Error", error.response.data);
		});
	}

	resetWorkspace() {
		Utility.log("DELETE /api/store");
		axios.delete('/api/store')
		.then(function(response) {
			Utility.log("resetWorkspace Success", response.data);
		})
		.catch(function(error) {
			Utility.log("resetWorkspace Error", error.response.data);
		});
	}

	downloadMetadataSp(url, callback_response, callback_error) {
		Utility.log("POST /api/metadata-sp/download");
		axios.post('/api/metadata-sp/download', {url: url})
		.then(function(response) {
			Utility.log("downloadMetadataSp Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("downloadMetadataSp Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	checkMetadataSp(test, callback_response, callback_error) {
		Utility.log("GET /api/metadata-sp/check/" + test);
		axios.get('/api/metadata-sp/check/' + test, {timeout: 900000})
		.then(function(response) {
			Utility.log("checkMetadataSp Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("checkMetadataSp Error", error);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	getRequest(callback_response, callback_error) {
		Utility.log("GET /api/request");
		axios.get('/api/request')
		.then(function(response) {
			Utility.log("getRequest Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getRequest Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}	

	checkRequest(test, callback_response, callback_error) {
		Utility.log("GET /api/request/check/" + test);
		axios.get('/api/request/check/' + test, {timeout: 900000})
		.then(function(response) {
			Utility.log("checkRequest Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("checkRequest Error", error);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	getTestResponse(options, callback_response, callback_error) {
		Utility.log("POST /api/test-response/" + options.suiteid + "/" + options.caseid);
		axios.post('/api/test-response/' + options.suiteid + "/" + options.caseid, options)
		.then(function(response) {
			Utility.log("getTestResponse Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getTestResponse Error", error);
			callback_error((error.response!=null) ? error : "Service not available");
		});
	}	

	getSignedXml(options, callback_response, callback_error) {
		Utility.log("POST /api/sign");
		axios.post('/api/sign', {
			xml: options.xml,
			sign_response: options.sign_response,
			sign_assertion: options.sign_assertion
		})
		.then(function(response) {
			Utility.log("getSignedXml Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getSignedXml Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}	
	
	sendResponse(options, callback_response, callback_error) {
		Utility.log("POST /sendResponse");
		axios.post('/sendResponse', {
			destination: options.destination,
			response: options.response
		})
		.then(function(response) {
			Utility.log("sendResponse Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("sendResponse Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}	

}

export default MainService;
