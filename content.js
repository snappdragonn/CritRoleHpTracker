var apiKey = "";
var authorization = "";
var host = ""   //Twitch or Youtube
var minimised = false;  //if the popup is minimised
var episodeNum = 0;
var campaignNum = 0;
var episodeData;  //json data of events in the episode
var charData;   //json data of the player characters
var currentTimeSlot = 0; //the index of the time at the end of a time slot (between events)
var previousTime = 0;   //the time in the video when lasted checked of events (used to determine if the used has jumped to a differenet point in the video)
var updateTimer;  //timer for checking for new events (every second)

var displayType = "number";   //what type of player panels to use (number or healthbar)
var orientation = "vertical";   

//used to change to size of headshots and hp text - should change this to be less bad.
var hpSize = {"h": 0.8, "w": 0.4};
var imgSize = {"h": 0.8, "w": 0.3};
var nameSize = {"h": 0.3, "w": 0.125};

//stores the players and panels. The player at index i corresponds to the panel at index i
var panels = [];
var players = [];


var initiativeOrder = [];
var currentInitiative = -1;








//------------------------------------------------------------------------------
// Panel Classes
//------------------------------------------------------------------------------

//parent panal class - displays hp info of a player.
//Makes the panel and adds it to the DOM, stores the state of the panel (death save or not), swaps panal type when hit 0 hp.
class Panel{
  panel;  //panel element in the DOM

  playerId;   //index of this panel and corresponding player in the panel and player arrays

  isDeathSave = false;

  pauseUpdate = false;

  //Makes the panal for a player and adds it to the DOM. the player object must aleady be in the player array
  constructor(playerId, parentDiv){
    this.playerId = playerId;

    if(players[playerId] != null && players[playerId].currentHp <= 0){
      this.makeDeathSavePanel();
    }else{
      this.makePanel();
    }

    parentDiv.appendChild(this.panel);

    if(parentDiv.getElementsByClassName("chracterStatsPanel").length <= 0 && players[playerId] != null){ //if parent does not contain characterStatsPanel add it
      parentDiv.appendChild(players[playerId].statsPanel);

      this.panel.addEventListener("mouseenter", (e) => onPanelHover(e, players[playerId].statsPanel));
    }

  }

  makePanel(){}

  makeDeathSavePanel(){}

  //update this panel to reflect changes to the player (e.g hp change) and swap to death save panel type if at 0 hp
  update(){
    if(this.pauseUpdate) return;
    var newHp = players[this.playerId].currentHp;
    this.swapType(newHp, players[this.playerId].deathSaves);
    if(this.isDeathSave){
      this.updateDeathSavePanel(players[this.playerId].deathSaves);
    }else{
      this.updatePanel(newHp);
    }
  }

  //swap to death save panel type
  swapType(newHp, deathSaves){
    if(newHp <= 0  && !this.isDeathSave){
      this.makeDeathSavePanel();
    }else if(newHp > 0 && this.isDeathSave){
      this.makePanel();
    }
  }

  hasDeathSaves(){
    return players[this.playerId].deathSaves[0] > 0 || players[this.playerId].deathSaves[1] > 0
  }

  updateDeathSavePanel(saves){}

  updatePanel(newHp){}

  //set the hp/healthbar display ignoring the actual hp of the player
  setHpDisplay(value, color, sliderWidth, bloody){}
  unsetHpDisplay(){}

  //take html for the panel as a string and turn it into a DOM element
  setPanel(string){
    var tmp = document.createElement("div");
    tmp.innerHTML = string;
    var newPanel = tmp.firstElementChild;

    if(this.panel != null){
      this.panel.replaceWith(newPanel);
    }

    this.panel = newPanel;

    if(players[this.playerId] != null){
      this.panel.addEventListener("mouseenter", (e) => onPanelHover(e, players[this.playerId].statsPanel));
    }

    return this.panel;
  }

}



//A player panel that displays hp as a number
class NumberPanel extends Panel {

  //make the panel html element
  makePanel(){
    var htmlstring = /*html*/`
                      <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="false" style="background-color: ${players[this.playerId].characterColor}; display: grid; grid-template: 1fr / 1fr 1fr">
                        <div class="playerImage" style="display: flex; justify-content: center;">
                          <div style="position: relative;">
                            <img class="headshotImg" src=${players[this.playerId].headShotImg} alt="headshot" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%;">
                            <img class="headshotOverlay" src="${chrome.runtime.getURL("/icons/bloodSpatter.png")}" style="display: ${(players[this.playerId].currentHp < (players[this.playerId].maxHp/2)) ? "inline" : "none"}">
                          </div>
                          <!-- <div class="playerName">${players[this.playerId].characterName}</div> -->
                        </div>
                        <div class="hpNumber" style="display: flex; flex-direction: column; align-items: center;">
                          <h1>${players[this.playerId].currentHp}</h1>
                          <h4 class="tmpHp" data-visibility="${players[this.playerId].tmpHp == 0 ? "hidden" : "visible"}">+${players[this.playerId].tmpHp}</h4>
                        </div>
                      </div>
                    `;

    this.isDeathSave = false;
    let panel = this.setPanel(htmlstring);
    if(players[this.playerId] != undefined && players[this.playerId].displaySet.length > 0){  //if setHpDisplay event was used to set the hp/healthbar to a different value
      let displaySet = players[this.playerId].displaySet;
      this.setHpDisplay(displaySet[0], displaySet[1], displaySet[2], displaySet[3])
    }

    return panel;
  }

  //make the death save panel html element
  makeDeathSavePanel(){
    var emptySuccessImgscr = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
    var emptyFailImgscr = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
    var successImgscr = chrome.runtime.getURL("/hearts/successHeart.png");
    var failImgscr = chrome.runtime.getURL("/hearts/failHeart.png");

    var htmlstring = /*html*/`
                      <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="true" style="background-color: ${players[this.playerId].characterColor}; display: grid; grid-template: 50% 50% / 50% 16% 16% 16%;">
                        <div class="playerImage" style="grid-area: 1 / 1 / 3 / 2; display: flex; justify-content: center; ${players[this.playerId].isDead() ? "filter: grayscale(1) brightness(0.5);" : ""}">
                          <div style="position: relative; height: 100%">
                            <img class="headshotImg" src=${players[this.playerId].headShotImg} alt="headshot" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%;">
                            <img class="headshotOverlay" src="${chrome.runtime.getURL("/icons/bloodSpatter.png")}" style="display: inline">
                          </div>
                          <!-- <div class="playerName">${players[this.playerId].characterName}</div> -->
                        </div>

                        <img src=${successImgscr} alt="sHeart1" class="SuccessHeart" style="grid-area: 1 / 2 / 2 / 3; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${successImgscr} alt="sHeart2" class="SuccessHeart" style="grid-area: 1 / 3 / 2 / 4; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${successImgscr} alt="sHeart3" class="SuccessHeart" style="grid-area: 1 / 4 / 2 / 5; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${failImgscr}    alt="fHeart1" class="FailHeart"    style="grid-area: 2 / 2 / 3 / 3; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${failImgscr}    alt="fHeart2" class="FailHeart"    style="grid-area: 2 / 3 / 3 / 4; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${failImgscr}    alt="fHeart3" class="FailHeart"    style="grid-area: 2 / 4 / 3 / 5; object-fit: contain; width: 100%; height: 100%;">

                      </div>
                    `; //TODO only set headshotOeverlay the inline display if it should be visible otherwise set it to none display

    this.isDeathSave = true;
    this.setPanel(htmlstring);
    this.updateDeathSavePanel(players[this.playerId].deathSaves);
    return this.panel;
  }

  //saves = [total num success, total num fail]
  updateDeathSavePanel(saves){
    var successHearts = this.panel.getElementsByClassName("SuccessHeart");
    var failHearts = this.panel.getElementsByClassName("FailHeart");

    //gray out player image when dead
    if(players[this.playerId].isDead()){
      this.panel.getElementsByClassName("playerImage")[0].style.filter = "grayscale(1) brightness(0.5)";
    }else{
      this.panel.getElementsByClassName("playerImage")[0].style.filter = "unset";
    }

    //update deathsave images
    for(i=0; i<successHearts.length; i++){
      if(saves[0] >= i+1){ //successes
        successHearts[i].src = chrome.runtime.getURL("/hearts/successHeart.png");
      }else{
        successHearts[i].src = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
      }

      if(saves[1] >= i+1){ //fails
        failHearts[i].src = chrome.runtime.getURL("/hearts/failHeart.png");
      }else{
        failHearts[i].src = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
      }
    }
  }

  updatePanel(newHp){
    //the hp number
    var playerPanel = this.panel.getElementsByTagName("h1")[0];
    playerPanel.innerText = newHp;

    //make player image bloody if bellow half hp
    if(newHp < (players[this.playerId].maxHp/2)){
      this.panel.getElementsByClassName("headshotOverlay")[0].style.display = "inline";
    }else{
      this.panel.getElementsByClassName("headshotOverlay")[0].style.display = "none";
    }

    //if player has tmp hp display it bellow normal hp
    var hpNum = this.panel.getElementsByClassName("hpNumber")[0];
    if(players[this.playerId].tmpHp > 0){ //add tmp hp number
      hpNum.lastElementChild.style.display = "block";
      hpNum.lastElementChild.dataset.visibility = "visible";
      hpNum.lastElementChild.innerHTML = "+" + players[this.playerId].tmpHp;
    }else if(hpNum.childElementCount > 1){
      hpNum.lastElementChild.style.display = "none";
      hpNum.lastElementChild.dataset.visibility = "hidden";
      hpNum.lastElementChild.innerHTML = "";
    }
  }

  //set the hp independent of the players real hp - more flexable
  setHpDisplay(value, color, sliderWidth, bloody){
    if(!this.isDeathSave){
      var playerPanel = this.panel.getElementsByTagName("h1")[0];
      playerPanel.innerText = value;

      if(bloody){
        this.panel.getElementsByClassName("headshotOverlay")[0].style.display = "inline";
      }else{
        this.panel.getElementsByClassName("headshotOverlay")[0].style.display = "none";
      }

      this.pauseUpdate = true; //stop updating planel when player hp changes
      players[this.playerId].displaySet = [value, color, sliderWidth, bloody];

    }   
  }

  //go back to displaying the real player hp
  unsetHpDisplay(){
    this.pauseUpdate = false;
    players[this.playerId].displaySet = [];
    this.update();
  }


}



//A player panel that displays hp as a health bar
class HeathbarPanel extends Panel {

  //make the panel html element
  makePanel(){
    var htmlstring = /*html*/`
            <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="false" style="background-color: ${players[this.playerId].characterColor}; justify-content: center;">
              <div class="barFlexbox" style="display: flex; flex-direction: column; gap: 3px; align-items: flex-start; height: 80%; width: 90%">
                <div class="barPanelHeader" style="flex: 1; height: 45%; align-self: flex-start;">
                  <img src=${players[this.playerId].headShotImg} alt="headshot" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%; float: left; border-radius: 50%; margin: 0 3px 0 0;"></img>
                  <div class="barPlayerName" style="float: left; font-weight: bold;">${players[this.playerId].characterName}</div>
                </div>
                <div class="healthBar">
                  <div class="barBackground"></div>
                  <div class="slider hpSlider" style="width: ${Math.min(players[this.playerId].currentHp / charData[this.playerId].hp, 1) * 100}%;"></div>
                  <div class="slider tmpHpSlider" style="background-color: rgba(10, 100, 255, 0.4); width: ${Math.min(players[this.playerId].tmpHp / charData[this.playerId].hp, 1) * 100}%;"></div>
                  <div class="healthbarHpNum"><div>${players[this.playerId].currentHp + players[this.playerId].tmpHp}</div></div>
                </div>
              </div>
            </div>
          `;

    this.isDeathSave = false;
    let panel = this.setPanel(htmlstring);
    if(players[this.playerId] != undefined && players[this.playerId].displaySet.length > 0){  //if setHpDisplay event was used to set the hp/healthbar to a different value
      let displaySet = players[this.playerId].displaySet;
      this.setHpDisplay(displaySet[0], displaySet[1], displaySet[2], displaySet[3])
    }
    return panel;
  }

  //make the death save panel html element
  makeDeathSavePanel(){
    var emptySuccessImgscr = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
    var emptyFailImgscr = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
    var successImgscr = chrome.runtime.getURL("/hearts/successHeart.png");
    var failImgscr = chrome.runtime.getURL("/hearts/failHeart.png");

    var htmlstring = /*html*/`
            <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="false" style="background-color: ${players[this.playerId].characterColor}; justify-content: center;">
              <div class="barDeathSaveGrid">
                <div class="barPanelHeader" style="grid-area: 1 / 1 / 2 / 7; min-height: 0;">
                  <img class="barPlayerImg" src=${players[this.playerId].headShotImg} alt="headshot" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%; float: left; border-radius: 50%; margin: 0 3px 0 0; ${players[this.playerId].isDead() ? "filter: grayscale(1) brightness(0.5);" : ""}"></img>
                  <div class="barPlayerName" style="float: left; font-weight: bold;">${players[this.playerId].characterName}</div>
                </div>
                <img src=${successImgscr} alt="sHeart1" class="SuccessHeart" style="object-fit: contain; width: 100%; height: 100%; grid-area: succ1">
                <img src=${successImgscr} alt="sHeart2" class="SuccessHeart" style="object-fit: contain; width: 100%; height: 100%; grid-area: succ2">
                <img src=${successImgscr} alt="sHeart3" class="SuccessHeart" style="object-fit: contain; width: 100%; height: 100%; grid-area: succ3">
                <img src=${failImgscr}    alt="fHeart1" class="FailHeart"    style="object-fit: contain; width: 100%; height: 100%; grid-area: fail1">
                <img src=${failImgscr}    alt="fHeart2" class="FailHeart"    style="object-fit: contain; width: 100%; height: 100%; grid-area: fail2">
                <img src=${failImgscr}    alt="fHeart3" class="FailHeart"    style="object-fit: contain; width: 100%; height: 100%; grid-area: fail3">
              </div>
            </div>
          `;

    this.isDeathSave = true;
    this.setPanel(htmlstring);
    this.updateDeathSavePanel(players[this.playerId].deathSaves);
    return this.panel;
  }

  updatePanel(newHp){
    //set slider with
    var slider = this.panel.getElementsByClassName("slider")[0];
    slider.style.width = (Math.min(newHp / charData[this.playerId].hp, 1) * 100) + "%";

    //set hp number on health bar
    var hpNum = this.panel.getElementsByClassName("healthbarHpNum")[0];
    hpNum.firstElementChild.innerHTML = newHp + players[this.playerId].tmpHp;

    //set tmp hp slider width
    var tmpHpSlider = this.panel.getElementsByClassName("tmpHpSlider")[0];
    tmpHpSlider.style.width = (Math.min(players[this.playerId].tmpHp / charData[this.playerId].hp, 1) * 100) + "%";
  }

  //saves = [num success, num fail]
  updateDeathSavePanel(saves){
    var successHearts = this.panel.getElementsByClassName("SuccessHeart");
    var failHearts = this.panel.getElementsByClassName("FailHeart");

    //gray out player image when dead
    if(players[this.playerId].isDead()){
      this.panel.getElementsByClassName("barPlayerImg")[0].style.filter = "grayscale(1) brightness(0.5)";
    }else{
      this.panel.getElementsByClassName("barPlayerImg")[0].style.filter = "unset";
    }

    //update death save images
    for(let i=0; i<successHearts.length; i++){
      if(saves[0] >= i+1){ //successes
        successHearts[i].src = chrome.runtime.getURL("/hearts/successHeart.png"); //TODO get fail and success heart urls at start and set as global var
      }else{
        successHearts[i].src = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
      }

      if(saves[1] >= i+1){ //fails
        failHearts[i].src = chrome.runtime.getURL("/hearts/failHeart.png");
      }else{
        failHearts[i].src = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
      }
    }

  }

  //set the hp independent of the players real hp - more flexable
  setHpDisplay(value, color, sliderWidth, bloody){
    if(!this.isDeathSave){
      var slider = this.panel.getElementsByClassName("slider")[0];
      slider.style.width = sliderWidth;
      slider.style["background-color"] = color;

      var hpNum = this.panel.getElementsByClassName("healthbarHpNum")[0];
      hpNum.firstElementChild.innerHTML = value;

      this.pauseUpdate = true; //stop updating the panel when the player hp changes
      players[this.playerId].displaySet = [value, color, sliderWidth, bloody];

    }
  }

  //go back to displaying the real player hp
  unsetHpDisplay(){
    this.pauseUpdate = false;
    this.panel.getElementsByClassName("slider")[0].style["background-color"] = "";
    players[this.playerId].displaySet = [];
    this.update();
  }


}


//stores the current state of the player (hp, death saves, spell slots), player info (stats, color, image), and the player stats panel
class PlayerChracter {
  id;
  characterName = "Name";
  level = 0;
  chracterClass = "Class";
  classLevels = {};
  armorClass = 0;
  maxHp = 0;
  stats = {"str":0, "dex":0, "con":0, "int":0, "wis":0, "cha":0};
  spellslots = [];
  spellslotsLeft = []

  characterColor = "steelblue";
  headShotImg;

  currentHp;
  tmpHp = 0;
  deathSaves = [0,0]; //[numSuccess, numFailed]

  displaySet = []; //used for setting the panel display independent of the real hp

  statsPanel;

  // makes player and stats panel
  constructor(id, name, lvl, charClass, classLevels, ac, hp, stats, spellslots, color, imgURL){
    this.id = id;
    this.characterName = name;
    this.level = lvl;
    this.chracterClass = charClass;
    this.classLevels = classLevels;
    this.armorClass = ac;
    this.maxHp = hp;
    this.currentHp = hp;
    this.stats = stats;
    this.spellslots = (spellslots != undefined) ? spellslots : [];
    this.spellslotsLeft = [...this.spellslots];
    this.characterColor = color;
    this.headShotImg = imgURL

    this.makePanel();
  }

  isDead(){
    return this.deathSaves[1] >= 3;
  }

  update(newHp, deathSaves){ //TODO is this being used?
    this.currentHp = newHp;
    this.deathSaves = deathSaves;

    panels[this.id].update();
  }

  //add to hp - amount can be negative to subtract hp
  updateHp(amount, updatePanel){
    if(amount < 0 ){ //remove temp hp before normal hp
      if(Math.abs(amount) <= this.tmpHp){
        this.tmpHp -= Math.abs(amount);
        amount = 0;
      }else{
        amount += this.tmpHp;
        this.tmpHp = 0;
      }
    }

    //update normal hp - cant go bellow 0 of above the players max
    this.currentHp = Math.min(Math.max(this.currentHp + amount, 0), this.maxHp);
    if(this.currentHp > 0){
      this.deathSaves = [0,0]
    }


    if(updatePanel){
      panels[this.id].update();
    }
  }

  addDeathSave(isSuccess, amount, updatePanel){
    if(isSuccess){
      this.deathSaves[0] = Math.min(this.deathSaves[0] + amount, 3);
    }else{
      this.deathSaves[1] = Math.min(this.deathSaves[1] + amount, 3);
    }

    if(updatePanel){
      panels[this.id].update();
    }
  }

  addEffect(effectName, effectDesc, level){
    if(this.statsPanel.getElementsByClassName(effectName.replace(/\s+/g, '')).length == 0){ //if an effect with the same name does not exist make it and add to the stats panel
      this.statsPanel.getElementsByClassName("EffectsBox")[0].insertAdjacentHTML("beforeend", /*html*/` 
                                                                  <div class="effect ${effectName.replace(/\s+/g, '')}" style="background-color: ${this.characterColor};">
                                                                    <div class="effectInner" style="background-color: #606060; border: solid black 1px; padding: 0 2px">
                                                                      ${effectName}${level ? ": " + level : ""} 
                                                                    </div>
                                                                    <div class="tooltip">${effectDesc}</div>
                                                                  </div>
                                                                `);
    }else{ //if an effect with the same name (html class) already exists update its level and/or description
      let effectElem = this.statsPanel.getElementsByClassName(effectName.replace(/\s+/g, ''))[0];
      if(effectDesc){
        effectElem.lastElementChild.innerHTML = effectDesc;
      }
      if(level){
        effectElem.firstElementChild.textContent = effectName + ": " + level;
      }
    }
  }

  //remove an effect with a given name
  removeEffect(effectName){
    if(this.statsPanel.getElementsByClassName(effectName.replace(/\s+/g, '')).length == 0){
      console.warn("Effect to remove does not exist: " + effectName);
      return;
    }
    let effectsBox = this.statsPanel.getElementsByClassName("EffectsBox")[0];
    effectsBox.removeChild(effectsBox.getElementsByClassName(effectName.replace(/\s+/g, ''))[0]);
  }

  removeAllEffects(){
    this.statsPanel.getElementsByClassName("EffectsBox")[0].replaceChildren();
  }

  addTmpHp(amount, updatePanel){
    this.tmpHp += amount;

    if(updatePanel){
      panels[this.id].update();
    }
  }

  //update the spell slots of this player
  //remove = if the spell slot is being used or gained back
  //amount = the amount of spell slots at the level to use of gain back
  updateSpell(level, amount, remove){
    let spell = level-1; //level is the level of the spell, 'spell' is the index of the spell slots at that level that the player had left (level starts at 1, spell starts at 0)
    if(spell >= 0 && spell < this.spellslotsLeft.length){ //if the spell is not a cantrip (uses a spell slot) and is of a level the player can cast remove the spell slots used
      let diff = (amount != undefined) ? parseInt(amount) : 1; // if amount not set default to 1
      diff = (remove) ? -diff : diff;
      this.spellslotsLeft[spell] = Math.max(this.spellslotsLeft[spell] + diff, 0); //add or remove the spell slots

      //update the stats panel to show the new amount of spell slots the player has left
      let slots = this.statsPanel.getElementsByClassName("spellSlotLevel")[spell].getElementsByClassName("slot");
      this.statsPanel.getElementsByClassName("spellSlotLevel")[spell].title = "lvl " + (level) + ": " + this.spellslotsLeft[spell] + "/" + this.spellslots[spell];
      for(let i=0; i<slots.length; i++){
        if(i<this.spellslotsLeft[spell]){
          slots[i].style["background-color"] = this.characterColor;
        }else{
          slots[i].style["background-color"] = "";
        }
      }

    }else if (spell != -1){ //if spell is -1 (level 0) then not error - is just cantrip
      console.warn("updateSpell (" + this.characterName + "): spell level (" + level + ") invalid")
    }
  }

  //set spell slots back to full
  restSpellslots(){
    this.spellslotsLeft = [...this.spellslots]; //copy the spellslots array

    //update the stats panel
    for(let lvl=0; lvl<this.spellslots.length; lvl++){
      let slots = this.statsPanel.getElementsByClassName("spellSlotLevel")[lvl].getElementsByClassName("slot");
      this.statsPanel.getElementsByClassName("spellSlotLevel")[lvl].title = "lvl " + (lvl+1) + ": " + this.spellslotsLeft[lvl] + "/" + this.spellslots[lvl];
      for(let i=0; i<slots.length; i++){
        slots[i].style["background-color"] = this.characterColor;
      }
    }
  }

  
  //Make the stats panel of this player - return the stats panel html element
  makePanel(){
    var panelStr = /*html*/`
                    <div class="chracterStatsPanel">
                      <div class="charBasicInfo">
                        <div class="statsHeader" style="background-color: ${this.characterColor};">
                          <span class="charName"> ${this.characterName} </span>
                          <span class="charLevel" style="float: right;"> ${this.level} </span>
                        </div>

                        <div class="classLevel" style="white-space: pre-wrap;">${this.getClassLevelString()}</div>
                      </div>


                      <div class="EffectsBox"></div>

                      <div class="separator"></div>

                      <div class="chracterStats" style="display: grid; grid-template-columns: 65% 35%;">

                        <table class="statsTable">
                          <tr>
                            <th>STR</th>
                            <td>${this.stats.str}</td>
                            <th>INT</th>
                            <td>${this.stats.int}</td>
                          </tr>
                          <tr>
                            <th>DEX</th>
                            <td>${this.stats.dex}</td>
                            <th>WIS</th>
                            <td>${this.stats.wis}</td>
                          </tr>
                          <tr>
                            <th>CON</th>
                            <td>${this.stats.con}</td>
                            <th>CHA</th>
                            <td>${this.stats.cha}</td>
                          </tr>
                        </table>

                        <div class="hp-ac" style="display: flex; flex-direction: column; justify-content: space-evenly; flex-grow: 1; align-items: center;">
                          <div class="statDiv" title="Max HP" style="position: relative">
                            <svg class="svgShape" viewBox="-25 0 50 45" style="display: block">
                              <path stroke="black" fill="${this.characterColor}"
                                d="M 0 7 
                                   C -20 -8   -40 22   0 42 
                                   C 40 22    20 -8    0 7 
                                   Z" />
                              <path stroke="black" fill="rgb(96, 96, 96)" stroke-width="1px"
                                d="M 0 10 
                                   C -19 -5   -35 22   0 39 
                                   C 35 22    19 -5    0 10 
                                   Z" />
                            </svg>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -55%);">${this.maxHp}</div>
                          </div>
                          <div class="statDiv" title="AC" style="position: relative;">
                            <svg class="svgShape" viewBox="-25 0 50 50" style="display: block">
                              <path stroke="black" fill="${this.characterColor}"
                                d="M -0 2 
                                   L -23 8
                                   C -24 45   0 48    0 48 
                                   C 0 48     24 45   23 8 
                                   L 0 2 
                                   Z" />
                                 <path stroke="black" fill="rgb(96, 96, 96)"
                                  d="M 0 4.5 
                                     L -20.5 10 
                                     C -21 42   0 45.5   0 45.5 
                                     C 0 45.5   21 42    20.5 10 
                                     L 0 4.5" />
                            </svg>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-55%, -50%);">${this.armorClass}</div>
                          </div>
                        </div>

                      </div>

                      ${(this.spellslots.length > 0) ? this.makeSpellslotsDisplay() : ""}

                    </div>
                  `;

    var tmp = document.createElement("div");
    tmp.innerHTML = panelStr;
    this.statsPanel = tmp.firstElementChild;

    return this.statsPanel;
  }

  //make the spell slots display (as an html string) for the stats panel
  makeSpellslotsDisplay(){

    console.log(this.spellslotsLeft);

    let displayStr = `<div class="separator"></div>
                      <div class="spellSlotsInfo">`;

    for(let level=0; level<this.spellslots.length; level++){
      displayStr += ` <div class="spellSlotLevel level-${level+1}" title="lvl ${level+1}: ${this.spellslotsLeft[level]}/${this.spellslots[level]}">
                        <div class="levelLable">${level+1}</div>`

      for(let slot=0; slot<this.spellslots[level]; slot++){
        displayStr += `<div class="slot" style="background-color: ${this.characterColor}"></div>`
      }

      displayStr += "</div>";
    }

    displayStr += "</div>";

    return displayStr;
  }


  // get the classes and levels in each class as a string (used when making the stats panel)
  getClassLevelString(){
    if(this.classLevels == undefined || Object.keys(this.classLevels).length === 0){
      return this.chracterClass + ": " + this.level;
    }else{
      return Object.entries(this.classLevels).map(([clazz, lvl]) => clazz + ": " + lvl).join("    ");
    }
  }



}







//------------------------------------------------------------------------------
// Update Panel Info
//------------------------------------------------------------------------------


function isInTimeSlot(time, timeslot){

  if(timeslot >= episodeData.length){ //time slot at the end
    if(time > episodeData[episodeData.length - 1].time){ //time also at end
      return true;
    }

  }else if(timeslot <= 0){ //time slot at the start
    if(time <= episodeData[0].time){ // time also at start
      return true;
    }

  }else{ //somewhere in the middle
    if(time > episodeData[timeslot-1].time && time <= episodeData[timeslot].time){ //time within the time slot (time slot is the index of the end time (inclusive) of the slot)
      return true
    }
  }

  return false;

}

function updateStats(){

  var videoPlayer = document.getElementsByTagName('video')[0];
  var currentTime = videoPlayer.currentTime;
  if(host === "twitch"){
    currentTime -= 900;
  }

  var isSeek = currentTime > previousTime+3 || currentTime < previousTime;
  //console.log(previousTime + " -> " + currentTime + " " + isSeek);
  previousTime = currentTime;


  if(!isInTimeSlot(currentTime, currentTimeSlot)){

    //console.log("new time slot");
    //find the new current time slot
    let oldTimeSlot = currentTimeSlot;
    for(i=0; i<=episodeData.length; i++){
      if(i >= episodeData.length || episodeData[i].time >= currentTime){
        currentTimeSlot = i;
        break;
      }
    }

    //update the players hp/deathsaves/etc
    if(currentTimeSlot > oldTimeSlot){ //moved forwards - apply all events from current time to the new time
      for(i=oldTimeSlot+1; i<=currentTimeSlot; i++){
        applyEvent(episodeData[i-1].event, false, isSeek);
      }
      updateAllPanels();

    }else if(currentTimeSlot < oldTimeSlot){ //moved backwards - apply all events from the begining to the new time
      resetPlayers();
      for(i=1; i<=currentTimeSlot; i++){
        applyEvent(episodeData[i-1].event, false, isSeek);
      }
      updateAllPanels(); //TODO either update panels here or within every event method on the player
    }


  }

  

}

function applyEvent(event, updateUI, isSeek){
  console.log("event: " + event.type);
  if(event.type === "hpUpdate"){
    if(event.hasOwnProperty("tmp") && event.tmp == true){
      getPlayer(event.characterName).addTmpHp(event.amount, updateUI);
    }else{
      getPlayer(event.characterName).updateHp(event.amount, updateUI);
    }
  }else if(event.type === "deathsave"){
    getPlayer(event.characterName).addDeathSave((event.saveType === "succeed"), (("amount" in event) ? event.amount : 1), updateUI);
  }else if(event.type === "longRest"){
    if(event.players != null){
      resetPlayers(event.players.map(name => getPlayer(name)));
    }else{
      resetPlayers();
    }

  }else if(event.type === "addEffect"){
    getPlayer(event.characterName).addEffect(event.effectName, event.effectDesc, event.level);
  }else if(event.type === "removeEffect"){
    getPlayer(event.characterName).removeEffect(event.effectName);

  }else if(event.type === "initiativeStart"){
    startInitiative(event.order);
  }else if(event.type === "initiativeEnd"){
    endInitiative();
  }else if(event.type === "nextInitiativeTurn"){
    nextInitiativeTurn(event);
  }else if(event.type === "pauseInitiative"){
    for(let panelObj of panels){
      panelObj.panel.parentElement.classList.remove("initiativeCurrent");
    }
  removeEnemyTurnMarkers();

  }else if(event.type === "setHpDisplay"){
    panels[getPlayer(event.characterName).id].setHpDisplay(event.value, event.color, event.sliderWidth, event.bloody);
  }else if(event.type === "unsetHpDisplay"){
    panels[getPlayer(event.characterName).id].unsetHpDisplay();

  }else if(event.type === "useSpell"){
    getPlayer(event.characterName).updateSpell(event.level, event.amount, true);
    if(event.spellInfo != undefined && !isSeek) displaySpellInfo(event.spellInfo);
  }else if(event.type === "regainSpell"){
    getPlayer(event.characterName).updateSpell(event.level, event.amount, false);
  } else if(event.type === "spellNotif"){ //TODO make this more general - for any type of notif?
    if(!isSeek) displaySpellInfo(event.spellInfo);

  }else{
    console.warn("invalid event: " + event.type);
  }

  //TODO update UI here
}

function getPlayer(name){
  for(let player of players){
    if(player.characterName === name){
      return player;
    }
  }
  console.warn("player not found: " + name)
  return null;
}

function updateAllPanels(){
  for(let panel of panels){
    panel.update();
  }
}

function resetPlayers(playersToReset = players){
  for(let player of playersToReset){
    player.deathSaves = [0,0];
    player.currentHp = player.maxHp;
    player.tmpHp = 0;
    player.removeAllEffects();
    panels[player.id].pauseUpdate = false;
    player.restSpellslots();
  }
  endInitiative()
}

function displaySpellInfo(spellInfo){
  console.log("show spell info");

  let notifContainer = document.getElementById("notifContainer");

  if(notifContainer.getElementsByClassName(spellInfo.name.replace(/\s+/g, '')).length > 0){
    console.log("already showing spell");
    return;
  }

  //add bold and italic tags to description
  let spellDesc = spellInfo.desc.replaceAll("*{", "<b>").replaceAll("}*", "</b>").replaceAll("-{", "<i>").replaceAll("}-", "</i>");

  notifContainer.insertAdjacentHTML("beforeend", /*html*/`
                                                  <div class="spellInfoNotif ${spellInfo.name.replace(/\s+/g, '')}">
                                                    <span>${spellInfo.name}</span>
                                                    <button class="closeButton" style="background-image: url(${chrome.runtime.getURL("icons/cross_.png")});"></button>
                                                    <div class="spellInfo" style="display: none">
                                                      <div class="spellName">
                                                        ${spellInfo.name}
                                                      </div>
                                                      <div class="spellStats" style="display: flex">
                                                      </div>
                                                      <div class="spellDesc">${spellDesc}</div>
                                                    </div>
                                                  </div> `);
  //let parent = document.getElementById("hpPanelsContainer");
  //document.getElementById("contentGrid").insertBefore(notifContainer, document.getElementById("hpPanelsContainer"));

  document.getElementById("trackerBlock").style.setProperty("--numNotifs", notifContainer.children.length);  

  notifElem = notifContainer.lastElementChild;

  let table = notifElem.getElementsByClassName("spellStats")[0];
  console.log(spellInfo);
  for(let key in spellInfo){
    if(key != "desc" && key != "name"){
      table.insertAdjacentHTML("beforeend", /*html*/`<div class="spellStatItem"> <div>${key}</div> <div>${spellInfo[key]}</div> </div>`);
    }
  }

  //set timer to remove the notification after a time
  let closeTimer = setTimeout((elem) => {
    if(elem.parentElement != null){
      elem.parentElement.removeChild(elem);
    }
  }, 30000, notifElem);

  //add onclick listener to the close button to remove the notif
  notifElem.getElementsByClassName("closeButton")[0].addEventListener("click", (e) => {
    e.currentTarget.parentElement.parentElement.removeChild(e.currentTarget.parentElement);
    document.getElementById("trackerBlock").style.setProperty("--numNotifs", notifContainer.children.length);
  });
  
  //add onclick listeners for opening and closing the spell info panel
  notifElem.addEventListener("click", (openEvent) => {  
    openEvent.stopPropagation();

    if(openEvent.currentTarget.getElementsByClassName("spellInfo")[0].style.display === "none"){
      openEvent.currentTarget.getElementsByClassName("spellInfo")[0].style.display = "block";

      clearTimeout(closeTimer);
      
      document.addEventListener("click", (closeEvent) => {
        console.log("close");
        //notifElem.getElementsByClassName("spellInfo")[0].style.display = "none";
        for(notif of notifContainer.children){
          notif.getElementsByClassName("spellInfo")[0].style.display = "none";
          //set timer to remove the notification after a time
          closeTimer = setTimeout((elem) => {
            if(elem.parentElement != null){
              elem.parentElement.removeChild(elem);
            }
          }, 30000, notif);
        }
      }, {once: true});

    }else {
      openEvent.currentTarget.getElementsByClassName("spellInfo")[0].style.display = "none";
      //set timer to remove the notification after a time
      closeTimer = setTimeout((elem) => {
        if(elem.parentElement != null){
          elem.parentElement.removeChild(elem);
        }
      }, 30000, openEvent.currentTarget);
    }
  });

  

}

function startInitiative(order){
  initiativeOrder = order;
  currentInitiative = -1;
  for(let i=0; i<order.length; i++){
    let name = order[i];
    panel = panels[getPlayer(name).id].panel.parentElement;
    panel.style.order = i+1;
    panel.classList.add("initiative");
    //if(i == currentInitiative){ panel.classList.add("initiativeCurrent"); }
  }

  //move players not in combat to the bottom of the list and add a separator above them
  if(initiativeOrder.length < players.length){
    for(let player of players){
      if(!initiativeOrder.includes(player.characterName)){ //if player is not in initiative
        panel = panels[player.id].panel.parentElement;
        panel.style.order = 99;
      }
    }
    let container = document.getElementById("hpPanelsContainer");
    container.insertAdjacentHTML("beforeend", /*html*/`<div class="separator initSeparator" style="order: 98;"></div>`);
  }

}

function endInitiative(){
  for(let panelObj of panels){
    panelObj.panel.parentElement.style.order = "";
    panelObj.panel.parentElement.classList.remove("initiative");
    panelObj.panel.parentElement.classList.remove("initiativeCurrent");
  }
  removeEnemyTurnMarkers();
  initiativeOrder = [];
  currentInitiative = -1;

   container = document.getElementById("hpPanelsContainer");
   for(let sep of container.getElementsByClassName("initSeparator")){
    sep.remove();
   }
}


function nextInitiativeTurn(event){
  // unhighlight all panels and remove all enemy turn markers
  for(let panelObj of panels){
    panelObj.panel.parentElement.classList.remove("initiativeCurrent");
  }
  removeEnemyTurnMarkers();

  //set next initiative (if is enemies turn don't change initiative)
  if(!event.isEnemy && (nextInit = getCharacterInitiative(event.characterName)) != undefined){
    currentInitiative = nextInit;
  }else if(!event.isEnemy){
    currentInitiative = (currentInitiative+1) % (initiativeOrder.length) //add one and at end loop back to start
  }

  //highlight next charater or mark enemy turn
  if(event.isEnemy){
    let order = (event.order == undefined) ? currentInitiative + 1 : event.order; //order starts at 1 but initiative starts at 0 
    document.getElementById("hpPanelsContainer").insertAdjacentHTML("beforeend", `<div class='enemyTurnMarker' style='order: ${order}'></div>`);
  }else{
    nextInitiativePanel = panels[getPlayer(initiativeOrder[currentInitiative]).id].panel.parentElement;
    nextInitiativePanel.classList.add("initiativeCurrent");
  }


}


function removeEnemyTurnMarkers(){
  let enemyTurnMarkers = document.getElementById("hpPanelsContainer").getElementsByClassName("enemyTurnMarker");
  for(marker of enemyTurnMarkers){
      marker.parentElement.removeChild(marker);
    }
}

function getCharacterInitiative(name){
  if(name == undefined) return undefined;
  for(let i=0; i<initiativeOrder.length; i++){
    if(name == initiativeOrder[i]){
      return i;
    }
  }
  console.warn("getCharacterInitiative - invalid character name: " + name);
}




function setPanelType(strType){
  displayType = strType;
  panelContainers = document.getElementsByClassName("panelContainer");
  for(let i=0; i<panelContainers.length; i++){
    panelContainers[i].replaceChildren(); //remove all children //TODO only remove panel child div not statsPanel child div

    //add new panels
    if(displayType == "healthBar"){
      panels[i] = new HeathbarPanel(i, panelContainers[i]);
    }else{
      panels[i] = new NumberPanel(i, panelContainers[i]);
    }
  }
  //updateStats(true);

  if(displayType == "healthBar"){
    document.getElementById("DisplayNumberButton").getElementsByTagName("img")[0].style.display = "none";
    document.getElementById("DisplayHealthbarButton").getElementsByTagName("img")[0].style.display = "block";
  }else{
    document.getElementById("DisplayNumberButton").getElementsByTagName("img")[0].style.display = "block";
    document.getElementById("DisplayHealthbarButton").getElementsByTagName("img")[0].style.display = "none";
  }

  chrome.storage.sync.set({ displayType: strType});
}


function minimise(){
  console.log("minimise");
  if(!minimised){
    document.getElementById("trackerBody").style.display = "none";
    document.getElementById("mainMenu").style.display = "none";
    minimised = true;
  }
}

function expand(){
  if(minimised){
    document.getElementById("trackerBody").style.display = "block";
    minimised = false;
  }
}

function openMainMenu(event){
  var menu = document.getElementById("mainMenu");
  menu.style.display = "block";
  document.addEventListener("click", closeMenu, false);

}

function closeMenu(event){
  if (event.target.closest("#menuContainer") == null || event.target.closest(".menuButton") != null){
    document.getElementById("mainMenu").style.display = "none";
    document.removeEventListener("click", closeMenu, false);
  }
}


function setOrientation(newOrientation){
  orientation = newOrientation;
  var container = document.getElementById("hpPanelsContainer");
  var popup = document.getElementById("trackerBody");
  let root = document.getElementById("trackerBlock");

  if(episodeData == null){
    popup.style.minHeight = "130px";
    popup.style.height = "180px";
    return;
  }


  root.dataset.orientation = newOrientation;

  root.style.setProperty("--widthMod", 1);
  root.style.setProperty("--heightMod", 1);

  root.style.setProperty("--numPanels", container.childElementCount);


  if(newOrientation === "vertical"){
    document.getElementById("verticalButton").getElementsByTagName("img")[0].style.display = "block";
    document.getElementById("horizonalButton").getElementsByTagName("img")[0].style.display = "none";

  }else if(newOrientation === "horizontal"){
    document.getElementById("verticalButton").getElementsByTagName("img")[0].style.display = "none";
    document.getElementById("horizonalButton").getElementsByTagName("img")[0].style.display = "block";


  }else{
    console.error("Orientation invalid");
  }

  chrome.storage.sync.set({ orientation: newOrientation });

}














//------------------------------------------------------------------------------
// make Tracker Popup
//------------------------------------------------------------------------------


function makeTable(){
  console.log("inject html");
  var height = 430;
  var minHeight = 290;
  var width = 150;
  var minWidth = 100;
  var flexDir = "column";

  var trackerHTML = /*html*/`
                      <div id="trackerBlock" data-orientation="vertical" style="right: 5px; top: 60px;">
                        <div id="expandButton" class="button">
                          <img src=${chrome.runtime.getURL("icons/CombatTrackerIcon.png")} style="height: 85%;">
                        </div>

                        <div id="trackerBody" style="flex-direction: ${flexDir}">
                          <div id="contentGrid">

                            <div id="trackerTitle" style="grid-area: title;">
                              <h4>HP Tracker</h4>
                            </div>

                            <div id="menuContainer" style="grid-area: menuButton; float: right; box-sizing: border-box;">
                              <div id="menuButton" class="button" style="height: 100%; width: 100%;">
                                <img src=${chrome.runtime.getURL("icons/menuIcon-white.png")} style="height: 85%;">
                              </div>
                              ${makeMenu()}
                            </div>

                            <div id="notifContainer" style="grid-area: notif"></div>

                            <div id="hpPanelsContainer" style="grid-area: content"> </div>

                            <div id="resizer">
                              <img src=${chrome.runtime.getURL("icons/dragSymbol.png")} style="width: 100%; vertical-align: top;">
                            </div>

                          </div>
                        </div>

                      </div>
                    `;

  document.body.insertAdjacentHTML("beforeend", trackerHTML);

  document.getElementById("menuButton").addEventListener("click", openMainMenu, false);

  document.getElementById("DisplayNumberButton").addEventListener("click", e => setPanelType("number"), false);
  document.getElementById("DisplayHealthbarButton").addEventListener("click", e => setPanelType("healthBar"), false);

  document.getElementById("verticalButton").addEventListener("click", e => setOrientation("vertical"), false);
  document.getElementById("horizonalButton").addEventListener("click", e => setOrientation("horizontal"), false);

  document.getElementById("expandButton").addEventListener("click", expand, false);
  document.getElementById("minButton").addEventListener("click", minimise, false);


  addDragListeners();

}



function makeMenu(){
  return /*html*/`
          <div id="mainMenu" class="menuDropDown">
            <div id="minButton" class="menuItem menuButton">
              <h4> Minimise </h4>
            </div>

            <div id="orientationOption" class="menuItem submenu">
              <img src="${chrome.runtime.getURL("icons/arrow-white.png")}">
              <h4 class="submenuButton"> Orientation </h4>

              <div class="menuDropDown submenuDropdown">
                <div id="verticalButton" class="menuItem menuButton radioButton">
                  <h4>Vertical</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="display: ${(orientation === 'vertical') ? 'block' : 'none'};">
                </div>
                <div id="horizonalButton" class="menuItem menuButton radioButton">
                  <h4>Horizontal</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="display: ${(orientation === 'horizontal') ? 'block' : 'none'};">
                </div>
              </div>

            </div>

            <div id="DisplayOption" class="menuItem submenu">
            <img src="${chrome.runtime.getURL("icons/arrow-white.png")}">
              <h4 class="submenuButton"> Display Type </h4>

              <div class="menuDropDown submenuDropdown">
                <div id="DisplayNumberButton" class="menuItem menuButton radioButton">
                  <h4>Number</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="display: ${(displayType === 'number') ? 'block' : 'none'};">
                </div>
                <div id="DisplayHealthbarButton" class="menuItem menuButton radioButton">
                  <h4>Healthbar</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="display: ${(displayType === 'healthBar') ? 'block' : 'none'};">
                </div>
              </div>
            </div>

          </div>
        `;
}

function makePanels(){
  var tbody = document.getElementById("hpPanelsContainer");
  tbody.replaceChildren();

  if(charData != null){ //data for the episode is available
    for(let i=0; i<charData.length; i++){

      console.log(charData[i]);

      players.push(new PlayerChracter(i,
                                      charData[i].name,
                                      charData[i].level,
                                      charData[i].charClass,
                                      charData[i].classLevels,
                                      charData[i].ac,
                                      charData[i].hp,
                                      charData[i].stats,
                                      charData[i].spellslots,
                                      charData[i].color,
                                      charData[i].imageURL));

      var panelContainer = document.createElement("div");
      panelContainer.className = "panelContainer";

      if(displayType == "healthBar"){
        panels.push(new HeathbarPanel(i, panelContainer));
      }else{
        panels.push(new NumberPanel(i, panelContainer));
      }

      tbody.appendChild(panelContainer);
    }

  }else{
    tbody.insertAdjacentHTML("beforeend", /*html*/`
                                          <div style="color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center">
                                            <h3>NO DATA</h3>
                                          </div>
                                        `);


  }
}





function InjectHTML(){

  var navFinished = false;

  //check if should add tracker popup every time a new video is loaded
  document.addEventListener("yt-navigate-finish", function(event) {
      console.log("nav finished");
      if (location.pathname.startsWith('/watch')) {
        console.log("watching video");
        navFinished = true;


      }
  });


  //check on the critical role or Geek & Sundry channel and if so get the campaing and episode number and add the tracker popup
  document.addEventListener("yt-page-data-updated", function(event){
    if(!navFinished){return;} //only execute directly after a yt-navigate-finish event

    var name = document.querySelector("#meta-contents #channel-name a").text;
    console.log(name);

    if(name === "Critical Role" || name === "Geek & Sundry"){ 

      //get the campaign and episode numbers 
      let videoTitle = document.getElementsByTagName("title")[0].textContent; 
      campaignNum = ((c = videoTitle.match(/(?<=Campaign\s)\d/g)) !== null) ? c[0] : (videoTitle.includes("Critical Role: THE MIGHTY NEIN") ? 2 : 0); //get the campaign number or 0 if it cannot be found
      episodeNum = ((e = videoTitle.match(/(?<=Episode\s)\d+/g)) !== null) ? e[0] : 0; //get the episode number or 0 if it cannot be found

      console.log("campaignNum = " + campaignNum);
      console.log("episodeNum = " + episodeNum);

      //if watching a campaign 2 or 3 episode get the data for that episode and add the tracker
      if((campaignNum == 3 || campaignNum == 2) && episodeNum > 0){

          makeTable();
          getEpisodeData(() => {
              document.getElementById("hpPanelsContainer").innerHTML = "";
              makePanels();
              setOrientation(orientation);

              //check every few seconds for an update to the stats
              if(episodeData != null && episodeData.length > 0){ //check there is data stored for the episode
                updateTimer = setInterval(updateStats, 1000);
              }

            }, makeReloadButton);

        }
    }
    

    navFinished = false;

  });


  //remove tracker when leave video
  document.addEventListener("yt-navigate-start", function(event) {
    removeTrackerPopup();
  });

}

function InjectHTMLTwitch(){ //Inject popup html when of twitch (instead of youtube)
  console.log("inject html on twitch: " + host);


      //Add tracker popup when navigate to vod and remove it when nagivate away from vod
      var obs = new MutationObserver(function (mutations, observer) {
        console.log("title changed");
        let videoTitle = document.getElementsByTagName("title")[0].innerText;
        console.log(videoTitle);
        removeTrackerPopup();
        if(videoTitle.startsWith("Critical Role Campaign 3") && location.pathname.startsWith("/videos")){ //watching vod
          console.log("is critical role c3 ep");
          
          //Add popup
          episodeNum = ((e = videoTitle.match(/(?<=Episode\s)\d+/g)) !== null) ? e[0] : 0;
          console.log(episodeNum);

          makeTable();
          getEpisodeData(() => {
              document.getElementById("hpPanelsContainer").innerHTML = "";
              makePanels();
              setOrientation(orientation);

              //check every few seconds for an update to the stats
              if(episodeData != null && episodeData.length > 0){ //check there is data stored for the episode
                updateTimer = setInterval(updateStats, 1000);
              }

            }, makeReloadButton);

        }
      });
      obs.observe(document.getElementsByTagName("title")[0], { childList: true, subtree: false, attributes: false, characterData: true });
      console.log("start observe");

}

function removeTrackerPopup(){
  if((tracker = document.getElementById("trackerBlock")) !== null) tracker.remove();
  if(updateTimer !== null) clearInterval(updateTimer);

  minimised = false;
  episodeNum = 0;
  episodeData = null;
  charData = null;
  currentTimeSlot = 0;
  // panels = [];
  players = [];
}




function makeReloadButton(status, message){
  var tbody = document.getElementById("hpPanelsContainer");
  tbody.replaceChildren();

  console.warn("Unable to get data \t" + status + " : " + message);

  tbody.insertAdjacentHTML("beforeend", /*html*/`
                                        <div style="color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center">
                                          <p style="font-size: 12px; margin: 0 0 5px 0">Something went wrong</p>
                                          <h3>Unable To Get Data</h3>
                                          <button id="reloadButton" style="margin-top: 30px;"> Reload Data </button>
                                        </div>
                                      `);

  document.getElementById("reloadButton").addEventListener("click", () => getEpisodeData(() => {

      document.getElementById("hpPanelsContainer").innerHTML = "";
      makePanels();
      setOrientation(orientation);

      //check every few seconds for an update to the stats
      if(episodeData != null && episodeData.length > 0){ //check there is data stored for the episode
        updateTimer = setInterval(updateStats, 1000);
      }

    }, makeReloadButton), false);

}



//get the episode data from the database
function getEpisodeData(successCallback, failCallback){
  var data = null;

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = false;

  document.getElementById("hpPanelsContainer").innerHTML = `<div class="spinner" style="width: 40px; height: 40px"></div>`;


  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      try{
        console.log("restdb responded");

        //console.log(this.responseText);
        console.log(this.status);
        console.log(this);

        if(String(this.status)[0] === "2"){

          var reponseJson = JSON.parse(this.responseText);
          episodeData = (reponseJson.length <= 0) ? null : reponseJson[0].data;
          charData = (reponseJson.length <= 0) ? null : reponseJson[0].characterData;
          console.log(episodeData);
          console.log(charData);

          successCallback();

        }else{
          failCallback(this.status, this.statusText);
        }
      }catch(e){
        console.error(e.name + ": " + e.message + "\n" + e.stack);
        episodeData = null;
        charData = null;
      }

    }
  });

  let documentName = (campaignNum == 3) ? "combat-data" : "combat-data-c2"
  xhr.open("GET", `https://critrolehpdata-5227.restdb.io/rest/${documentName}?q={\"EpNum\":${episodeNum}}`); //episodeNum critrolehpdata-5227 testdb-2091
  xhr.setRequestHeader("content-type", "application/json");
  xhr.setRequestHeader("x-apikey", apiKey);
  xhr.setRequestHeader("cache-control", "no-cache");
  xhr.setRequestHeader("authorization", authorization);

  console.log(authorization);

  xhr.send(data);
  console.log("request sent");
}










function onPanelHover(event, statsPanel){
  let delayTimer = setInterval(openStatsPanel, 500, statsPanel);
  statsPanel.parentElement.addEventListener("mouseleave", (e) => onPanelEndHover(e, delayTimer, statsPanel));
}

function onPanelEndHover(event, delayTimer, statsPanel){
  clearInterval(delayTimer);
  statsPanel.style.display = "none";
}

function openStatsPanel(statsPanel){
  statsPanel.style.display = "flex";
}


function addDragListeners(){
  document.getElementById('trackerTitle').addEventListener('mousedown', mouseDownDrag, false); //drag listener
  document.getElementById("resizer").addEventListener("mousedown", mouseDownResize, false); //resize listener
  window.addEventListener('mouseup', mouseUp, false);
}

function mouseUp(){
  window.removeEventListener('mousemove', divMove, true);
  window.removeEventListener('mousemove', divResize, true);
}

var mouseTrackerDiffPos
function mouseDownDrag(e){
  e.preventDefault()
  window.addEventListener('mousemove', divMove, true);

  divRight = parseInt((document.getElementById("trackerBlock").style.right).slice(0, -2));
  mouseTrackerDiffPos = (document.body.clientWidth - e.clientX) - divRight;
}

function mouseDownResize(e){
  e.preventDefault()
  window.addEventListener('mousemove', divResize, true);
}

function divMove(e){
  e.preventDefault()
  var div = document.getElementById("trackerBlock");
  div.style.top = clamp(e.clientY - 10, 0, window.innerHeight - div.offsetHeight) + "px";
  div.style.right = clamp(document.body.clientWidth - e.clientX - mouseTrackerDiffPos, 0, document.body.clientWidth - div.offsetWidth) + "px"; //move popup to mouse position offest on x so that mouse is in same place relative to popup as was when first mouse down
}

function divResize(e){
  e.preventDefault()
  let root = document.getElementById("trackerBlock");
  let rootStyle = window.getComputedStyle(root);
  let style = window.getComputedStyle(document.getElementById("trackerBody"));

  let newWidth = Math.max( (parseInt(style.getPropertyValue("width")) + (-e.movementX)), parseInt(style.getPropertyValue("min-width")) )
  let newHeight = Math.max( (parseInt(style.getPropertyValue("height")) + e.movementY), parseInt(style.getPropertyValue("min-height")) )

  let defaultH = Math.round( parseFloat(style.height) / parseFloat(rootStyle.getPropertyValue("--heightMod")) );
  let defaultW = Math.round( parseFloat(style.width) / parseFloat(rootStyle.getPropertyValue("--widthMod")) );
  let widthMod = newWidth / defaultW;
  let heightMod = newHeight / defaultH;
 
  root.style.setProperty("--widthMod", widthMod);
  root.style.setProperty("--heightMod", heightMod);
}


function clamp(n, min, max){
  return Math.max(Math.min(n, max), min);
}



chrome.storage.sync.get({
  displayType: 'number',
  orientation: 'vertical'
}, function(items) {
  console.log("display type = " + items.displayType);
  console.log("display type = " + items.orientation);
  displayType = items.displayType;
  orientation = items.orientation;
  console.log(orientation);
});

fetch(chrome.runtime.getURL("/apiKey.txt"))
  .then(response => response.json())
  .then(json => {apiKey = json.apikey; authorization = json.authorization});



console.log(location.hostname);
  if(location.hostname == "www.twitch.tv"){
    host = "twitch";
    InjectHTMLTwitch();
  }else if(location.hostname == "www.youtube.com"){
    host = "youtube";
    InjectHTML();
  }
