import axios from "axios";
import Utility from "./utility";

axios.defaults.headers.common['User-Agent'] = 'spid-saml-check-client/1.0';

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

	login(options, callback_response, callback_error) {
		Utility.log("GET /login");
		axios.get('/login?user=' + options.user + '&password=' + options.password)
		.then((response)=> {
			callback_response(response.data.apikey);
		})
		.catch((error)=> {
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}	

	assert(callback_response, callback_error) {
		Utility.log("GET /login/assert");
		axios.get('/login/assert')
		.then((response)=> {
			callback_response(response.data);
		})
		.catch((error)=> {
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	/*
	startPing() {
		Utility.log("START PING");
		setInterval(()=>this.ping(), 3000);
	}

	ping() {
		Utility.log("GET /ping");
		axios.get('/ping?apikey=' + Utility.getApikey())
		.catch(function (error) {
			window.location="/#/login";
		});
	}
	*/

	getInfo(callback_response, callback_nosession, callback_error) {
		Utility.log("GET /api/info");
		axios.get('/api/info?apikey=' + Utility.getApikey())
		.then(function(response) {
			Utility.log("getInfo Success", response.data);
			if(response.data.request) {
				callback_response(response.data);
			} else {
				callback_nosession(response.data);
			}
		})
		.catch(function(error) {
			Utility.log("getInfo Error", error);
			callback_error((error!=null) ? error : "Service not available");
		});
    }

	loadAllWorkspace(callback_response, callback_nosession, callback_error) {
		Utility.log("GET /api/stores?apikey=" + Utility.getApikey());
		axios.get('/api/stores?apikey=' + Utility.getApikey())
		.then(function(response) {
			Utility.log("loadAllWorkspace Success", response.data);
            callback_response(response.data);
		})
		.catch(function(error) {
			console.log(error);
			if(error.response.status==400) {
				callback_nosession();
			} else {
				callback_error((error.response!=null) ? error.response.data : "Service not available");
			}
		});
	}

	loadWorkspace(store_type, callback_response, callback_nosession, callback_error) {
		Utility.log("GET /api/store?store_type=" + store_type + "&apikey=" + Utility.getApikey());
		axios.get('/api/store?store_type=' + store_type + '&apikey=' + Utility.getApikey())
		.then(function(response) {
			Utility.log("loadWorkspace Success", response.data);
            callback_response(response.data);
		})
		.catch(function(error) {
			if(error.response.status==400) {
				callback_nosession();
			} else {
				callback_error((error.response!=null) ? error.response.data : "Service not available");
			}
		});
	}

	saveWorkspace(data) {
		Utility.log("POST /api/store", data);
		axios.post('/api/store?apikey=' + Utility.getApikey(), data)
		.then(function(response) {
			Utility.log("saveWorkspace Success", response.data);
		})
		.catch(function(error) {
			Utility.log("saveWorkspace Error", error.response.data);
		});
	}

	resetWorkspace(store_type, callback_response, callback_error) {
		Utility.log("DELETE /api/store?store_type=" + store_type);
		axios.delete('/api/store?store_type='+store_type+'&apikey=' + Utility.getApikey())
		.then(function(response) {
			Utility.log("resetWorkspace Success", response.data);
			callback_response();
		})
		.catch(function(error) {
			Utility.log("resetWorkspace Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	downloadMetadataSp(url, callback_response, callback_error) {
		Utility.log("POST /api/metadata-sp/download");
		axios.post('/api/metadata-sp/download?apikey=' + Utility.getApikey(), {url: url})
		.then(function(response) {
			Utility.log("downloadMetadataSp Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("downloadMetadataSp Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	uploadFile(file, check, profile, production, callback_progress_upload, callback_progress_download, callback_response, callback_error) {
		Utility.log("POST: /api/metadata-sp/upload/zip");
		const formData = new FormData();
		formData.append('file', file);
		formData.append('check', check);
		formData.append('profile', profile);
		formData.append('production', production);
		axios.post(' /api/metadata-sp/upload/zip?apikey=' + Utility.getApikey(), formData, {
		  	headers: { 'Content-Type': 'multipart/form-data' },
			onUploadProgress: (progressEvent)=>callback_progress_upload(progressEvent),
			onDownloadProgress: (progressEvent)=>callback_progress_download(progressEvent)
		})
		.then(function(response) {
			callback_response(response.data);
	  	})
	  	.catch(function(error) {
			callback_error((error.response!=null) ? error.response.data : "Service not available");
	  	});
	}

	setSessionMetadata(metadata, callback_response, callback_error) {
		Utility.log("PUT /api/metadata-sp");
		axios.put('/api/metadata-sp?apikey=' + Utility.getApikey(), {metadata: metadata})
		.then(function(response) {
			Utility.log("setSessionMetadata Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("setSessionMetadata Error", error.response.data);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	getLastCheckMetadataSp(test, callback_response, callback_error) {
		Utility.log("GET /api/metadata-sp/lastcheck/" + test);
		axios.get('/api/metadata-sp/lastcheck/' + test + '?apikey=' + Utility.getApikey(), {timeout: 900000})
		.then(function(response) {
			Utility.log("getLastCheckMetadataSp Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getLastCheckMetadataSp Error", error);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	checkMetadataSp(test, deprecated, production, callback_response, callback_error) {
		Utility.log("GET /api/metadata-sp/check/" + test);
		axios.get('/api/metadata-sp/check/' + test + 
			'?deprecated=' + (deprecated? 'Y':'N') +
			'&production=' + (production? 'Y':'N') +
			'&apikey=' + Utility.getApikey(), {timeout: 900000})
		.then(function(response) {
			Utility.log("checkMetadataSp Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("checkMetadataSp Error", error);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	getRequest(callback_response, callback_nosession, callback_error) {
		Utility.log("GET /api/request");
		axios.get('/api/request?apikey=' + Utility.getApikey())
		.then(function(response) {
			Utility.log("getRequest Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getRequest Error", error.response.data);
			if(error.response.status==400) {
				callback_nosession();
			} else {
				callback_error((error.response!=null) ? error.response.data : "Service not available");
			}
		});
	}	

	getLastCheckRequest(test, callback_response, callback_error) {
		Utility.log("GET /api/request/lastcheck/" + test);
		axios.get('/api/request/lastcheck/' + test + '?apikey=' + Utility.getApikey(), {timeout: 900000})
		.then(function(response) {
			Utility.log("getLastCheckRequest Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getLastCheckRequest Error", error);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}

	checkRequest(test, production, callback_response, callback_error) {
		Utility.log("GET /api/request/check/" + test);
		axios.get('/api/request/check/' + test + 
			'?production=' + (production? 'Y':'N') +
			'&apikey=' + Utility.getApikey(), {timeout: 900000})
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
		axios.post('/api/test-response/' + options.suiteid + '/' + options.caseid + '?apikey=' + Utility.getApikey(), options)
		.then(function(response) {
			if(response.status==206) {
				callback_error("I dati della Response sono parziali. Assicurarsi che il metadata sia stato caricato correttamente.");
			}
			Utility.log("getTestResponse Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getTestResponse Error", error);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}	

	getSignedXml(options, callback_response, callback_error) {
		Utility.log("POST /api/sign");
		axios.post('/api/sign?apikey=' + Utility.getApikey(), {
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
	
	getServerInfo(callback_response, callback_error) {
		Utility.log("GET /api/server-info");
		axios.get('/api/server-info', {timeout: 900000})
		.then(function(response) {
			Utility.log("getServerInfo Success", response.data);
			callback_response(response.data);
		})
		.catch(function(error) {
			Utility.log("getServerInfo Error", error);
			callback_error((error.response!=null) ? error.response.data : "Service not available");
		});
	}
}

export default MainService;
