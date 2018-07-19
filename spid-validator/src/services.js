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

	getMetadataSp(url, callback_response, callback_error) {
		Utility.log("POST /api/metadata-sp/download");
		axios.post('/api/metadata-sp/download', {url: url})
		.then(function(response) {
			Utility.log("getMetadataSp Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getMetadataSp Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	checkMetadataSp(callback_response, callback_error) {
		Utility.log("GET /api/metadata-sp/check");
		axios.get('/api/metadata-sp/check')
		.then(function(response) {
			Utility.log("checkMetadataSp Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("checkMetadataSp Error", error.response.data);
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

	getTestResponse(options, callback_response, callback_error) {
		Utility.log("POST /api/test-response/" + options.id);
		axios.post('/api/test-response/' + options.id, options)
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
