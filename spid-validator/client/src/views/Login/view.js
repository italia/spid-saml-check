import React from 'react';
import BlockUi from 'react-block-ui';
import './style.css';


function view(me) { 
    return (
		<div className="container container-login animated fadeIn">
			<div className="justify-content-center row">
				<div className="col col-md-8">
					<div className="card-group">
						<div className="p-4 card">
							<div className="card-body">
								<h1>Login</h1>
								<p className="text-muted">Inserisci le credenziali per accedere</p>
								<div className="mb-3 input-group">
									<div className="input-group-prepend">
										<span className="input-group-text"><i className="icon-user"></i></span>
									</div>
									<input type="text" 
										placeholder="Username" 
										className={'form-control ' + me.state.warn_user}
										onChange={(e)=>{me.setUser(e.target.value)}} >
									</input>
								</div>
								<div className="mb-4 input-group">
									<div className="input-group-prepend">
										<span className="input-group-text"><i className="icon-lock"></i></span>
									</div>
									<input type="password" 
										placeholder="Password" 
										className={'form-control ' + me.state.warn_password}
										onChange={(e)=>{me.setPassword(e.target.value)}} 
										onKeyPress={(e)=>{ (e.charCode==13)? me.login():{}}} >
									</input>
								</div>
								<div className="row">
									<div className="col-6">
										<button className="px-4 btn btn-primary"
											onClick={()=>{me.login()}}>Login</button>
									</div>
									{ /*
									<div className="text-right col-6">
										<button className="px-0 btn btn-link">Forgot password?</button>
									</div>
									*/ }
								</div>
							</div>
						</div>
						<div className="text-white bg-logo py-5 d-md-down-none card">
							<div className="text-center card-body align-middle">
								<div>
									<img className="img-fluid img-login-logo" src="/img/logo2.png" />
									{ /*<button className="mt-3 btn btn-primary active">Richiedi l'accesso</button> */ }
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
    );
}

export default view;                        
