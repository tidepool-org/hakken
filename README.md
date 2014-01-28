Hakken is a discovery platform.  Hakken means "discovery" in Japanese.

Hakken operates by having a number of "servers" or "coordinators" that house service listings.

The coordinators all know about each other and provide a method of finding other coordinators.

Clients of the discovery system then either 

1. Publish their own service listings to the coordinators so that other clients can find them
2. Query a coordinator for the hosts that are available for a specific service

Hakken is 100% eventually consistent.  Operations often take time to propagate throughout the cluster, this is normal and coding with this assumption in mind generally makes for significantly more robust services.

## Using hakken

Assuming you have some coordinators up and running you can publish to hakken with

``` javascript
var hakken = require('hakken')({ host: 'host_of_a_coordinator:port' }).client.make();
hakken.publish({ service: 'serviceName', host: 'self_host:port' });
```

Then another process can find you with

``` javascript
var hakken = require('hakken')({ host: 'host_of_a_coordinator:port' }).client.make();
hakken.start(function(err){
  var watch = hakken.randomWatch('serviceName');
  watch.start(function(err){
    // Get a working host
    var hostList = watch.get();
    console.log(hostList);
    watch.close();
  });
});
```

We use the optional callbacks on the `start()` methods to make sure we've communicated with a coordinator at least once before calling `get()`.  If you do not use a callback on the `start()` method and call `get()` immediately, then it will return an empty list because it won't have had a chance to actually communicate with the coordinator.

When working with hakken, most processes will not need more than one instance of a hakken client.  You can publish multiple services as well as attach multiple different watches from the same client object.  The reason to have multiple different client objects is if you need them to have a different set of configuration parameters, like `host` or `heartbeatInterval`.  In fact, multiple different hakken instances is going to add extra overhead to the whole system and should be avoided unless absolutely necessary.

`examples/integrated.js` is also an example script that fires up two coordinators and then fires up a couple of clients to do a publish and a watch.  It's a bit obfuscated by callback wonderfulness (at least I think that's what it is), if you know of an way to make it read easier, I'd love a pull request :).

### Publishing, In Depth

When you publish to hakken, you pass in a "service descriptor" that must have two fields, `service` and `host`.  It can have any number of other fields in it as well, they will be passed through to watches, so you can build whatever domain-specific semantics you want.  That said, it is useful to use fields such that you can pass the service descriptor into `require('url').format(serviceDescriptor)` and get a meaningful prefix out of it.

When you publish, your hakken client will attempt to send the listing to all of its known coordinators, but it might or might not succeed.  Never, fear, though, for it will keep trying every heartbeatInterval and it will hopefully succeed at some point.  There is currently no way to unpublish something without calling `.close()` on the hakken client object.

Generally speaking, it is most common for a server to publish to hakken once it has instantiated everything else and is now ready to take requests.

### Watches, In Depth

When you setup a watch in Hakken, you are telling Hakken that you want to continuously watch for changes in membership to a specific service.  The watch is long-lived and even has a lifecycle (it has `start()` and `close()` methods).  Generally speaking, watches are created once early in the lifecycle of the process and those watch instances are passed around to objects that need to find hosts to talk to.  If you are creating a watch per request, or anything more than a limited, probably constant, number of times, you are probably using them incorrectly.

The `randomWatch()` method showcased above actually just delegates the watch to the `watch()` method on the hakken client.  There are multiple arguments that can be passed into each of these, and the best place to figure them out is from the method-level documentation on the code [client.js](https://github.com/tidepool-org/hakken/blob/master/lib/client/client.js#L304).

Watch objects have three methods on them:

1. `get()` returns a list of descriptors that match the watch.  The list size will depend on the updater passed to the watch.  For the `randomWatch()` method as invoked above, the list will length 0 or 1.  For ways to make it larger, read the docs on the methods in [client.js](https://github.com/tidepool-org/hakken/blob/master/lib/client/client.js#L383).
2. `start()` starts the watch, this must be called before `get()` can be called.  The start method can take a callback, which will be called after the first successful sync from a coordinator.  Note, this does not guarantee that `get()` will return an actual host, the sync could have found zero servers, meaning that get() would return an empty list.
3. `close()` closes the watch.  This causes the poll to stop polling on the next go round.

### Client Configuration

When dealing with the client methods, the following configuration options are available.  But you should generally only need to specify the `host`.

* `host` - required, the host used by the client to find the coordinators
* `heartbeatInterval` - optional (default: 20000), the interval to check for changes on the coordinator.  This should really be the same for all nodes and should be something discovered from the coordinator, but it's not yet.
* `pollInterval` - optional (default: 60000), the interval to check back with each known coordinator for changes to the set of coordinators
* `resyncInterval` - optional (default: pollInterval * 10), the interval to check back with the `host` for changes to the set of coordinators

Note that the client configuration only takes a single `host`.  The client will use that single `host` parameter to find other coordinators and then it will use the whole set of coordinators that it finds in order to do its job.  This means that even though you might have multiple coordinators, you should still only pass a single `host`, hakken will do the stuff to make sure it is leveraging all of the servers available on its own.

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
