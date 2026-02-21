Need:

Account tools:

- GET /api/v2/accounts/{accountUid}/balances Get an account's balance
- GET /api/v2/accounts Get the accounts associated with an account holder
- GET /api/v2/accounts/{accountUid}/identifiers Get an account's bank identifiers

Profile picture

- GET /api/v2/account-holder/{accountHolderUid}/profile-image Get a profile image if one exists
- PUT /api/v2/account-holder/{accountHolderUid}/profile-image Update a profile image if one already exists
- DELETE /api/v2/account-holder/{accountHolderUid}/profile-image Delete a profile image if one exists

Address tool:

- GET /api/v2/addresses Get the account holder's addresses
- POST /api/v2/addresses Update the account holder's current address

Card tool (slider toggles):

- PUT /api/v2/cards/{cardUid}/controls/atm-enabled Update ATM withdrawal control
- PUT /api/v2/cards/{cardUid}/controls/enabled Update card lock
- PUT /api/v2/cards/{cardUid}/controls/currency-switch Update currency switch payments control
- PUT /api/v2/cards/{cardUid}/controls/gambling-enabled Update gambling payments control
- PUT /api/v2/cards/{cardUid}/controls/mag-stripe-enabled Update magstripe payments control
- PUT /api/v2/cards/{cardUid}/controls/mobile-wallet-enabled Update mobile wallet payments control
- PUT /api/v2/cards/{cardUid}/controls/online-enabled Update online payments control
- PUT /api/v2/cards/{cardUid}/controls/pos-enabled Update card present payments (contactless and chip and pin) control
- GET /api/v2/cards Get all the cards for an account holder

Regular payment tools:

- GET /api/v2/direct-debit/mandates/{mandateUid} Get the direct debit mandate with the specified identifier
- DELETE /api/v2/direct-debit/mandates/{mandateUid} Cancel the direct debit mandate with the specified identifier
- GET /api/v2/direct-debit/mandates Get a list of direct debit mandates
- GET /api/v2/direct-debit/mandates/account/{accountUid} Get a list of direct debit mandates
- GET /api/v2/direct-debit/mandates/{mandateUid}/payments Get a transaction history for a direct debit

Feed Items:
Attachment:

- GET /api/v2/feed/account/{accountUid}/category/{categoryUid}/{feedItemUid}/attachments Fetches the list of items attached to a feed item

Payees:
See payees tool:
GET /api/v2/payees Get an account holder's payees
GET /api/v2/payees/{payeeUid}/image Serves the image for the payee
GET /api/v2/payees/{payeeUid}/account/{accountUid}/scheduled-payments Get scheduled payments
GET /api/v2/payees/{payeeUid}/account/{accountUid}/payments View a history of payments to your payee
PUT /api/v2/payees Create a payee
PUT /api/v2/payees/{payeeUid} Update a payee
DELETE /api/v2/payees/{payeeUid} Deletes a payee

See payee tool:
GET /api/v2/payees/{payeeUid} Get a specific account holder payee

Create payee tool:
PUT /api/v2/payees Create a payee

Optional:
Technical tool (not exposed to the user):

- /api/v2/account-holder
- /api/v2/account-holder/name
