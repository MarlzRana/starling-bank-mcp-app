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
