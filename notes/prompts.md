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

Prompt 6:
Let's make a display-create-payee tool that just presents the UI, that then calls the create-payee tool to actually action the request. Remember the details about 2FA.  
 display-create-payee tool should take in the same parameters as create payee, but all of them are optional, in the sense that the model if it has partial details should spawn  
 display-create-payee, but if it has all info upfront just call create-payee. Update the respective tool descriptions to make this clear and guide the agents that use these tools. Here  
 is spec info (with an example that we are not doing): Yes, the spec supports this. A few mechanisms enable it:

    Calling Tools with User Input

    The view can call tools/call directly. So your UI can render a form, collect input from the user, then fire a tool call with those
    arguments:

    User fills form → View calls tools/call → Server processes → View receives tool-result notification

    App-Only Tools

    You can define tools with visibility: ["app"] — these are hidden from the model but callable by your UI. This is perfect for form
    submission endpoints that shouldn't be exposed to the agent:

    {
      "name": "submit_transfer",
      "visibility": ["app"]
    }

    Sending to Chat

    If you want the input to trigger a model response, the view can send ui/message which adds a message to the conversation:

    { "method": "ui/message", "params": { "role": "user", "content": { "type": "text", "text": "..." } } }

    Practical Pattern

    So a full input-first flow could be:

    1. Model calls a tool (e.g. open_transfer_form) with minimal/no args
    2. Your UI renders — user fills in recipient, amount, etc.
    3. On submit, view calls an app-only submit_transfer tool with the collected data
    4. View renders the result (success/error)

Prompt 7:

## Mission

- Allow users to see their payments to a particular payee, and what payee account they used to to make each payment
- Allow users to see their scheduled payments to a particular payee, and what payee account they will use to make each scheduled payment

## Relevant APIs:

- GET /api/v2/payees/{payeeUid}/account/{accountUid}/scheduled-payments (Get scheduled payments)
- GET /api/v2/payees/{payeeUid}/account/{accountUid}/payments (view a history of payments to your payee into get-payees, so users can see their historic and scheduled payments.
- GET /api/v2/payees/{payeeUid} (Get a specific account holder payee)

## Directive

- Introduce a `get-payee-historic-payments` that takes in a payee uid and since, and that for each payee account under that payee, get's payments. The UI should present cards presenting each payment information and what payment account was used (with the bank, account identifier, scheme and other relevant info)
- Introduce a `get-payee-scheduled-payments` that takes in a payee uid and since, and that for each payee account under that payee, get's scheduled payments. The UI should present cards presenting the scheduled payment info and what payment account was used (with the bank, account identifier, scheme and other relevant info)

## Guidance

- Make sure to respect the color scheme.
- Design it to look good and visually appealing in Claude Desktop
- Use animations to make the UI feel slick but not gimmick animations - something professional
- Use @swagger.json to understand the APIs
- **Keep in mind `{accountUid}` is actually the payeeAccountUid. This is an API naming mistake. Make the tools use payeeAccountUid for consistency.**

Future:

- Introduce two new icons (a history one and scheduled payments) to the payees view that lets users see their payments and scheduled payments to that user in a separate views
- In the payee accounts view (where payees have more than 1 payee accounts under them), make this functionality available as well
- For payees with multiple payee accounts, just make this available at the payee account level
- **Keep in mind `{accountUid}` is actually the payeeAccountUid. This is an API naming mistake. Make the tools use payeeAccountUid for consistency.**

Prompt 9:

## Mission

- Support the ability for users to interact with their spaces in their Starling Bank app

## Space definition

A Space is a pot of money within your app, kept separate from your balance. It’s great for getting expenses neatly sorted and under your control.

## Important technical information

- A space uid/savings goal uid is a category uuid under the hood
- The API calls spaces savings goals but in the app it's called a space. Use the terminology of a space and map eg. concepts like like a space uuid to a savings goal uuid under the hood

## Tools to create

- `get-space` get a single space given an account uuid and space uuid. This should present the space photo, the relevant data about the space and give the user the ability to click the space and see the transaction in that space between now and 3 years ago. Make the get-transactions a separate tool for now that only MCP apps to use under the hood
- `create-space` will allow the user to create a space and then upon success present UI confirming the creation and the details used
- `display-create-space` will present a UI allow the user to pick an account (use the `get-accounts` with the `useCallTool` hook under the hood). It should optionally take in the same parameters as `create-space` as arguments to pre-fill the create space form with, in a similar way to `create-payee`. Do not make the user manually enter an account uuid. Use the `get-accounts` tool via the `useCallTool` hook to create an account selector, in which you grab the account uuid to make the space under. Present the same confirmation UI as the `create-space` tool does - share UI if useful

## Relevant APIs

GET /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid} Get a savings goal
GET /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid}/photo Get the photo associated with a savings goal
GET /api/v2/feed/account/{accountUid}/category/{categoryUid}/transactions-between
PUT /api/v2/account/{accountUid}/savings-goals Create a savings goal

## Guidance

- **Use a team and assign team members work - do not do the entire thing yourself - act as a team lead**
- Read @swagger.json to understand the Starling API
- The other savings goals APIs will be implemented in a follow up

Prompt 10:

## Mission

- Support the ability for users to see all their spaces by calling one tool

## Space definition

A Space is a pot of money within your app, kept separate from your balance. It’s great for getting expenses neatly sorted and under your control.

## Important technical information

- A space uid/savings goal uid is a category uuid under the hood
- The API calls spaces savings goals but in the app it's called a space. Use the terminology of a space and map eg. concepts like like a space uuid to a savings goal uuid under the hood

## Tool to create

- `get-spaces` will return you all the spaces associated with an account. The user should be presented with a list of their spaces, and then they should be able to click the space, to get the same view as `get-space` returns. In the top level view that presents all the spaced under a given account make sure to also present the space photo.

## Relevant APIs

GET /api/v2/account/{accountUid}/savings-goals Get all savings goals
GET /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid}/photo Get the photo associated with a savings goal
GET /api/v2/feed/account/{accountUid}/category/{categoryUid}/transactions-between

## Guidance

- Read @swagger.json to understand the Starling API
- The other savings goals APIs will be implemented in a follow up

Prompt 11:

## Mission

- Support the ability for users to update their spaces

## Space definition

A Space is a pot of money within your app, kept separate from your balance. It’s great for getting expenses neatly sorted and under your control.

## Important technical information

- A space uid/savings goal uid is a category uuid under the hood
- The API calls spaces savings goals but in the app it's called a space. Use the terminology of a space and map eg. concepts like like a space uuid to a savings goal uuid under the hood

## Tool to create

- `update-space` allows the user to update a space, and then upon success present UI confirming the new space details and then upon success present UI confirming the update and the details used
- `display-update-space` will present a UI allow the user to pick an account (use the `get-accounts` with the `useCallTool` hook under the hood). It should optionally take in the same parameters as `update-space` as arguments to pre-fill the create space form with, in a similar way to `update-payee`. Do not make the user manually enter an account uuid. Use the `get-accounts` tool via the `useCallTool` hook to create an account selector, in which you grab the account uuid to edit the space under. Do not make the user manually enter an space uuid. Use the `get-spaces` tool via the `useCallTool` hook to create an spaces selector, in which you grab the space uuid to make the space under. Present the same confirmation UI as the `update-space` tool does - share UI if useful.

## Relevant APIs

PUT /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid} Update an existing goal

## Guidance

- Read @swagger.json to understand the Starling API
- Make sure the user can update a space photo
- The other savings goals APIs will be implemented in a follow up

Prompt 14:

## Mission

Support the ability for Starling Customers to move money in and out of spaces.

## Space definition

A Space is a pot of money within your app, kept separate from your balance. It’s great for getting expenses neatly sorted and under your control.

## Important technical information

- A space uid/savings goal uid is a category uuid under the hood
- The API calls spaces savings goals but in the app it's called a space. Use the terminology of a space and map eg. concepts like like a space uuid to a savings goal uuid under the hood

## Tools

- Make a `get-uuid` tool that is used to generate the UUID e.g. for a transfer uuid/any uuid needed for idempotency
- Make a `add-money-to-space` tool that optionally takes in an account uuid and space uuid (if not present). If they are not provided, present pickers that let you pick an account and space (use the useCallTool on get-accounts and get-spaces to support this)
  This transfer money from the main category into the space.
- Make a `withdraw-money-from-spaces` tool that optionally takes in an account uuid and space uuid (if not present). If they are not provided, present pickers that let you pick an account and space (use the useCallTool on get-accounts and get-spaces to support this). This allow users to withdraw money from their space back into their primary category/main balance.

## Relevant APIs

- PUT /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid}/add-money/{transferUid} Add money into a savings goal
- PUT /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid}/withdraw-money/{transferUid} Withdraw money from a savings goal

## Guidance

- Read @swagger.json to understand the Starling API
- When the user kicks off a transfer/withdrawal, black tint out screen, and show a transferring message with a nice animations as we are waiting, and then transitions to a green tint with a tick, and then presents the user with the info of the transfer/withdrawal with a button that let's them return the main screen/get rid of the tint
- The other savings goals APIs will be implemented in a follow up

Prompt 15:

## Mission

- Support the ability for Starling Bank customers to not just make a 1 time payment to

## Relevant APIs

- GET /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid}/recurring-transfer Get the recurring transfer of a savings goal
- PUT /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid}/recurring-transfer Create a recurring transfer into a savings goal
- DELETE /api/v2/account/{accountUid}/savings-goals/{savingsGoalUid}/recurring-transfer Delete the recurring transfer of a savings goal
