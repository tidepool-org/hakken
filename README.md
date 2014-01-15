Hakken is a discovery platform.  Hakken means "discovery" in Japanese.

Hakken operates by having a number of "servers" or "coordinators" that house service listings.

The coordinators all know about each other and provide a method of finding other coordinators.

Clients of the discovery system then either 

1. Publish their own service listings to the coordinators so that other clients can find them
2. Query a coordinator for the hosts that are available for a specific service

## Using hakken

Assuming you have some coordinators up and running you can publish to hakken with

``` javascript
var hakken = require('hakken')({ host: 'coordinator_host:port' }).client.make();
hakken.publish({ service: 'serviceName', host: 'self_host:port' });
```

Then another process can find you with

``` javascript
var hakken = require('hakken')({ host: 'coordinator_host:port' }).client.make();
var watch = hakken.watchers.random().wrap(hakken.watch('serviceName'));
watch.start();

// Get a working host
setTimeout(function(){
  var host = watch.get();
  watch.close();
}, 1000);
```

We set timeout to give hakken a chance to lookup the service.  If you do watch.get() immediately after setting the watch, you will not have any nodes because it won't have had a chance to actually find them.

`examples/integrated.js` is also an example script that fires up two coordinators and then fires up a couple of clients to do a publish and a watch.  It's a bit obfuscated by callback wonderfulness (at least I think that's what it is), if you know of an way to make it read easier, I'd love a pull request :).

### Client Configuration

When dealing with the client methods, the following configuration options are available.  But you should generally only need to specify the `host`.

* `host` - required, the host used by the client to find the coordinators
* `heartbeatInterval` - optional (default: 20000), the interval to check for changes on the coordinator.  This should really be the same for all nodes and should be something discovered from the coordinator, but it's not yet.
* `pollInterval` - optional (default: 60000), the interval to check back with each known coordinator for changes to the set of coordinators
* `resyncInterval` - optional (default: pollInterval * 10), the interval to check back with the `host` for changes to the set of coordinators

## Setting up coordinators

You can run the coordinator two ways:

1. As a stand-alone server from this project with:

    ``` bash
    node coordinator.js
    ```

    The coordinator takes configuration parameters from environment variables, `env.js` specifies all of the available options, documents them and shows defaults.  So, check it out.

2. Embedded in your own code with

    ``` javascript
    require('./lib/hakken.js')({host: 'FQDN_discovery_host'}).server.makeSimple('localhost', 123456).start();
    ```

The recommended deployment configuration is to have at least 2 coordinators running for redundancy.  Put them behind a load balancer and use the address of the load balancer as the host for configuring your hakken clients as well as for the DISCOVERY_HOST parameter.

Putting them behind a load balancer will mean that as new nodes come up, they will eventually gossip around and find each other.  The only gotcha is with the initial setup.  It is possible to have two coordinators behind a load balancer and have them always get routed to themselves when gossiping.  Eventually, randomness from the LB *should* resolve this, but it can also be mitigated at deploy time by only having one node in the LB at the start.

### How coordinator gossip works

The coordinators find out about each other through "gossip".  The protocol is

1. Connect to `DISCOVERY_HOST` and ask for current set of coordinators
2. Announce self with all coordinators found and setup poll at `DISCOVERY_HEARTBEAT_INTERVAL`
3. Repeat process every `RESYNC_POLL_INTERVAL` millis

The protocol for step 2 above ("setup poll") is

1. Load coordinators from host
2. If error happens, remove the coordinator and blacklist them.
3. If list of coordinators is returned, add any new coordinators and setup poll

### How publishing works

Each hakken client is in charge of publishing its service descriptor(s) to all known coordinators.  On `publish()` the client will

1. Add the listing to a set of heartbeats that happen every `DISCOVERY_HEARTBEAT_INTERVAL` millis
2. Submit a listing to each coordinator it knows about

### How watches work

On a watch, the hakken client will pick ***one*** coordinator and poll it at `DISCOVERY_HEARTBEAT_INTERVAL` millis.  The protocol is

1. If listings are returned
    1. The current set of listings is replaced with those new listings.
2. If there is an issue talking to the chosen coordinator
    1. The current set of listings is untouched
    1. The bad coordinator is removed
    1. Another coordinator is chosen
3. If no coordinators are available
    1. The current set of listings remains untouched
    1. The client keeps looking for a coordinator to update from