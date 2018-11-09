import React from 'react';
import BlockUi from 'react-block-ui';
import './style.css';


function view(me) { 
    return (
		<div className="container container-login animated fadeIn">
			<div className="justify-content-center row">
				<div className="col col-md-9">
					<div className="card-group">
						<div className="p-4 card worksave-card" 
                            onClick={()=>{me.startContinue()}}>

							<div className="card-body">
								<h1><img className="img-fluid worksave-img-continue" src="/img/continue.svg" />Continua</h1>
								<p className="worksave-text-muted">Continua report precedente.<br/>Continua a lavorare dallo stato precedente conservando le impostazioni e l'esito dei test già effettuati.</p>
								<div className="mb-3 input-group">

								</div>
							</div>
						</div>
                        <div className="p-1"></div>
						<div className="p-4 card worksave-card"
                            onClick={(e)=>{me.startNew()}}>

							<div className="card-body">
								<h1><img className="img-fluid worksave-img-new" src="/img/new.svg" />Nuovo</h1>
								<p className="worksave-text-muted">Inizia nuovo report.<br/>Inizia una nuova sessione di validazione annullando tutte le impostazioni e gli eventuali test effettuati in precedenza.</p>
								<div className="mb-3 input-group">

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
