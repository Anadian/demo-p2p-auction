#!/usr/bin/env node
/**
# [swarm.js](source/swarm.js)
> Create a hyperswarm.

Author: Anadian

Code license: MIT
```
	Copyright 2022 Anadian
	Permission is hereby granted, free of charge, to any person obtaining a copy of this 
software and associated documentation files (the "Software"), to deal in the Software 
without restriction, including without limitation the rights to use, copy, modify, 
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to 
permit persons to whom the Software is furnished to do so, subject to the following 
conditions:
	The above copyright notice and this permission notice shall be included in all copies 
or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
Documentation License: [![Creative Commons License](https://i.creativecommons.org/l/by-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-sa/4.0/)
> The source-code comments and documentation are written in [GitHub Flavored Markdown](https://github.github.com/gfm/).

*/

//# Dependencies
	//## Internal
	import getTypedArrayIsZeroed from './typed-array-is-zeroed.js';
	//## Standard
	import CryptoNS from 'node:crypto';
	//## External
	import HyperDHT from 'hyperdht';
	import HyperSwarm from 'hyperswarm';
//# Constants
const FILENAME = 'swarm.js';
//## Errors

//# Global Variables
/**## Functions*/
/**
### Swarm
> Constructor for an opinionated hyperswarm instance.
#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object? | Additional options to pass to the smart constructor. |

##### Options Properties
| name | type | description |
| --- | --- | --- |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if `options` is neither an object nor `null` |

#### History
| version | change |
| --- | --- |
| 0.0.0 | Introduced |
*/
export default function Swarm( options = {} ){
	if( !( this instanceof Swarm ) ){
		return new Swarm( options );
	}
	const FUNCTION_NAME = 'Swarm';
	console.log( `${FUNCTION_NAME}: ${options}` );

	this.swarmID = ( this.swarmID || options.swarmID ) ?? ( 0 );
	console.log( "swarmID: %d", this.swarmID );
	this.seed = ( this.seed || options.seed ) ?? ( new Uint8Array( 32 ) );
	this.keyPair = ( this.keyPair || options.keyPair ) ?? ( HyperDHT.keyPair( this.seed ) );
	this.swarm = ( this.swarm || options.swarm ) ?? ( new HyperSwarm( { keyPair: this.keyPair } ) );
	console.log( "publicKey: %O", this.keyPair.publicKey );
	this.anyEventFunction = ( this.anyEventFunction || options.anyEventFunction ) ?? ( function( event_name, ...rest ){ const arguments_array = Array.from( rest ); console.log( "Swarm: %d event: %s rest: %O", this.swarmID, event_name, arguments_array ); } );
	this.swarm.on( 'open', this.anyEventFunction.bind( this, 'open' ) );
	this.swarm.on( 'close', this.anyEventFunction.bind( this, 'close' ) );
	this.swarm.on( 'listen', this.anyEventFunction.bind( this, 'listen' ) );
	this.swarm.on( 'listening', this.anyEventFunction.bind( this, 'listening' ) );
	this.swarm.on( 'bootstrap', this.anyEventFunction.bind( this, 'bootstrap' ) );
	this.swarm.on( 'ready', this.anyEventFunction.bind( this, 'ready' ) );
	this.swarm.on( 'persistent', this.anyEventFunction.bind( this, 'persistent' ) );
	this.swarm.on( 'wake-up', this.anyEventFunction.bind( this, 'wake-up' ) );
	this.swarm.on( 'network-change', this.anyEventFunction.bind( this, 'network-change' ) );
	this.swarm.on( 'nat-update', this.anyEventFunction.bind( this, 'nat-update' ) );
	this.swarm.on( 'connect', this.anyEventFunction.bind( this, 'connect' ) );
	this.swarm.on( 'connection', this.anyEventFunction.bind( this, 'connection' ) );
	this.swarm.on( 'update', this.anyEventFunction.bind( this, 'update' ) );
	this.swarm.on( 'flush', this.anyEventFunction.bind( this, 'flush' ) );
	this.swarm.on( 'announce', this.anyEventFunction.bind( this, 'announce' ) );
	this.swarm.on( 'join', this.anyEventFunction.bind( this, 'join' ) );
	this.topic = ( this.topic || options.topic ) ?? ( new Uint8Array( 32 ) );
	this.testTopic = ( this.testTopic || options.testTopic ) ?? ( true );
	if( this.testTopic === true ){
		console.log('testTopic is true');
		if( getTypedArrayIsZeroed( this.topic ) === true ){
			console.log('topic is zeroed.');
			const topic_string = 'AUCTIONS';
			for( var i = 0; i < topic_string.length; i++ ){
				this.topic[i] = ( topic_string.codePointAt(i) % 256 );
			}
		}
	}
	console.log( `${FUNCTION_NAME}: ${this.swarmID} topic: ${this.topic}` );
	this.joinOptions = ( this.joinOptions || options.joinOptions ) ?? ( { server: true, client: true } );
	this.peerDiscovery = ( this.peerDiscovery || options.peerDiscovery ) ?? ( this.swarm.join( this.topic, this.joinOptions ) );
	var connections_array = [];
	this.connectionFunction = ( this.connectionFunction || options.connectionFunction ) ?? ( ( socket, peer_info ) => {
		console.log( "on connection: swarmID: %d socket.publicKey: %O socket.remotePublicKey: %O peer_info: %O", this.swarmID, socket.publicKey, socket.remotePublicKey, peer_info );
		this.swarm.joinPeer( socket.remotePublicKey );
	} );
	this.swarm.on( 'connection', this.connectionFunction );
	this.updateFunction = ( this.updateFunction || options.updateFunction ) ?? ( ( ...rest ) => { const arguments_array = Array.from( rest ); console.log( "on update: %d, %O", this.swarmID, arguments_array ); }  );
	this.swarm.on( 'update', this.updateFunction );
	this.errorFunction = ( this.errorFunction || options.errorFunction ) ?? ( ( error ) => { console.error( "Swarm(%d) emitted error: %s", this.swarmID, error ); } );
	this.swarm.on( 'error', this.errorFunction );
	if( this.joinOptions.server === true ){
		this.dhtServer = ( this.dhtServer || options.dhtServer ) ?? ( this.swarm.dht.createServer( this.connectionFunction ) );
		this.listenPromise = ( this.listenPromise || options.listenPromise ) ?? ( this.dhtServer.listen( this.keyPair ) );
	}
	if( this.joinOptions.client === true ){
		this.dhtConnection = ( this.dhtConnection || options.dhtConnection ) ?? ( this.swarm.dht.connect( this.keyPair.publicKey ) );
	}

	return this;
}

//var swarm = new Swarm();
//await swarm.peerDiscovery.flushed();
var swarm_server = new Swarm( { swarmID: 1, joinOptions: { server: true, client: false } } );
var swarm_client = new Swarm( { swarmID: 2, joinOptions: { server: false, client: true } } );
