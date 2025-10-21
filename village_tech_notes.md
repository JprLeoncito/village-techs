Build a platform for managing a residential community. This residential community is managed and governed by a homeowners association. The officers of the homeowners association are elected periodically (E.G. every 5 years) and is tasked to set up policies and implement programs for the residential community.

The platform is a multi-tenant application and can support multiple residential communities.

We have the following roles:
- superadmin: platform administrator, manages residential communities (tenant)
- admin-head (tenant): residential community admin, manages household residents
- admin-officers (tenant): residential community admin, manages household residents
- household-head (tenant): resident admin, manages household users
- household-member (tenant): registered resident under a household
- household-beneficial-user (tenant): non-resident but associated with a household, issued a vehicle pass
- security-head (tenant): admin of security group
- security-officer (tenant): member of security group

We want to build the following apps
1. App Name: platform
  - creates new tenant: residential community
    - define residence information
    - define community entrances (gates)
  - create initial tenant users: admin head (for a residential community) and admin officers
2. App Name: admin
  - residential community admin
  - set up residence info and household head user
  - approves gate pass request for vehicles (as stickers)
  - sends annoucements to residents 
  - set up periodic election of residential community officers
  - approve construction permit: receive construction details and collect payment
3. App Name: residence
  - manage members of the household
  - manage list of beneficial users (non resident)
  - a household head can have one or more residences
  - request gate pass for vehicles
    - identify household members and beneficial users to receive gate passes
  - send construction permit 
    - send construction details and pay fees for construction
    - schedule construction workers individual gate pass
  - schedule house guests for visit
    - define visits as: day-trip or multi-day visit 
4. App Name: sentinel
  - used by security officers at the gate entrances to manage entry of residents, guests, deliveries and construction workers
  - manage and track individuals and vehicles passing through the community gates
    - info about deliveries 
    - guest list sent by household 
    - list of construction workers