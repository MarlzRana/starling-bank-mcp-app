Iteration 1:

/mcp-app-builder
**Task**:

- Create a simple get_accounts tool, that calls the accounts
  API, gets the balances per account, and identifiers per account and presents a nice MCP
  app. We are going to show this in the Claude Desktop app.

**Implementation Guidance**:

- Use colors that match that color scheme: #CC785C Antique Brass #828179 Friar Gray #F0EFEA Cararra #FFFFFF White #141413 Cod Gray.
- Refer to the @swagger.json.

** Authentication **

- The APIs will need a Bearer token. Create a .env file, with a variable where we can pass in this token, and load the token from there, whenever you need to make a request. You can load it once only startup.

---

Prompt 2:

- In the contents for get-accounts tool, return all the details.
- Bin the 8-ball widget.
- Implement the card controls, card with final 4 digits, put the sliders to slide controls on and off.
- Read the @swagger.json

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

Prompt 3:
/mcp-app-builder I have attached an image of what the current UI looks like. As you can see we present the card and then the controls underneath. Please instead just present the card, and a small footer saying "Adjust card controls by clicking/tapping your card". Then add the ability to click the card, and it flip around (make the animation), and it present the list of card controls of the card and their toggles (which we can toggle and off and we update relevant controls appropriately). In terms of design, make the back of the card look like the second image I have attached (get relevant information from the tool input and get-accounts tool, and for the name use this name "Marlin Ranasinghe", and use the contactless logo), and then in the same way as when the card is locked, put a black tint on it, and the card controls and their toggles on top of the black tint.

Prompt 4:
Read the @swagger.json and create a tool called get-account-holder which returns information about the account holder (the token is associated with). It should be one tool, that calls  
 both /api/v2/account-holder and /api/v2/account-holder/name and merges their response. And then from the get-cards UI call this tool to get the name of the account holder instead of hard  
 coding "Marlin Ranasinghe".

Prompt 5:
/mcp-app-builder

## CORE TASK:

Create a `get-payees` that allows me to see a list of my payees. Use @swagger.json for the API information.

## PRESENTATION:

It should present UI cards of payees. If the payee only has one payee account, present the payee account information in the same top level UI card. Else, if the payee has multiple payee accounts, use a chevron that takes them to the list of payee accounts under that payee. The top level payee UI cards should use the profile pictures you get back from the UI (don't return it in tool output).

## MUTABLE TOOL EXTENSION:

- Create three separate MCP tools called `create-payee`, `update-payee` and `delete-payee` that use the relevant APIs and also have their own UIs.
- The `create-payee` and `update-payee` mutable tool require 2FA. When the request is successful it means that just the 2FA has been triggered successfully (we can't check if the user approved/went through with the action).
- The UI returned in `get-payees` should provide the user the ability to execute these relevant options via the UI on the top level payees view using `useCallTool`.

### Individual Mutable Tool UI

- `create-payee` should present you a form allowing the user to create payee and add as many payee accounts as they want. The submit button should say "Create Payee", and then transition to "Requested you for confirmation on your device" only after the API responds. Remember to create a payee, we must at least define 1 payee.
- `update-payee` should present you a form allowing the user to update a payee. The submit button should say "Update Payee", and then transition to "Requested you for confirmation on your device" only after the API responds. Make sure for the placeholder text to use the current payee details. **Restrict updates only to the payee information, and not the payee accounts**
- `delete-payee` should just present the deleted payees detail on UI tool response. You will need to fetch the payee before actually deleting the payee.

### Mutable Tool Related UI in `get-payees`

- For `create-payee`, there should be a plus icon in the payee view, that takes you to a form that allows you to create a payee (reuse the individual tool one)
- For `update-payee`, there should be an edit icon on the payee card if it is a payee with a single payee account, else it should be on the payee account card, that takes you to a form that allows you to edit a payee (reuse the individual tool one)
- For `delete-payee` there should be a bin icon on the payee card if it is a payee with a single payee account, else it should be on the payee account card. Present a warning message to the user, that shadows the widget, asking the user if they really want to delete this payee, and only delete on confirmation.

## GUIDANCE

- Make sure to respect the color scheme.
- Design it to look good and visually appealing in Claude Desktop
- **We will add support for `delete-payee-account` in a follow - only focus on mutable actions related to payees.**
- Use animations to make the UI feel slick but not gimmick animations - something professional
- **Use a team and assign team members work - do not do the entire thing yourself - act as a team lead**
- **First begin by creating the mutable tools, and then create the `get-payees` tool**

## Relevant APIs

GET /api/v2/payees Get an account holder's payees
GET /api/v2/payees/{payeeUid}/image Serves the image for the payee
GET /api/v2/payees/{payeeUid}/account/{accountUid}/scheduled-payments Get scheduled payments
GET /api/v2/payees/{payeeUid}/account/{accountUid}/payments View a history of payments to your payee
PUT /api/v2/payees Create a payee
PUT /api/v2/payees/{payeeUid} Update a payee
DELETE /api/v2/payees/{payeeUid} Deletes a payee
