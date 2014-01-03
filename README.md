Hakken is a discovery platform.  Hakken means "discovery" in Japanese.

Hakken operates by having a number of "servers" or "coordinators" that house service listings.

The coordinators all know about each other and provide a method of finding other coordinators.

Clients of the discovery system then either 

1. Publish their own service listings to the coordinators so that other clients can find them
2. Query a coordinator for the hosts that are available for a specific service

Note, Hakken currently does not provide a replication mechanism across the coordinators.  It is assumed that clients will publish their listings with *all* available coordinators on their own. 