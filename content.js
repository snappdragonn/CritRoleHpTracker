var apiKey = "";
var authorization = "";
var minimised = false;
var episodeNum = 0;
var episodeData;
var charData;
var currentTimeSlot = 0; //the index of the time at the end of a time slot
var updateTimer;
const OrangeHp = 10;

var displayType = "number";
var orientation = "vertical";

var hpSize = {"h": 0.8, "w": 0.4};
var imgSize = {"h": 0.8, "w": 0.3};
var nameSize = {"h": 0.3, "w": 0.125};


var panels = [];
var players = []; //TODO make map instead <Name, Player>

var initiativeOrder = [];
var currentInitiative = "";








//------------------------------------------------------------------------------
// Panel Classes
//------------------------------------------------------------------------------

class Panel{
  panel;

  playerId;

  isDeathSave = false;

  constructor(playerId, parentDiv){
    this.playerId = playerId;

    if(players[playerId] != null && players[playerId].currentHp <= 0){
      this.makeDeathSavePanel();
    }else{
      this.makePanel();
    }

    parentDiv.appendChild(this.panel);

    if(parentDiv.getElementsByClassName("chracterStatsPanel").length <= 0 && players[playerId] != null){ //if does not contain characterStatsPanel add it
      parentDiv.appendChild(players[playerId].statsPanel);

      this.panel.addEventListener("mouseenter", (e) => onPanelHover(e, players[playerId].statsPanel));
    }

  }

  makePanel(){}

  makeDeathSavePanel(){}

  update(){
    var newHp = players[this.playerId].currentHp;
    this.swapType(newHp, players[this.playerId].deathSaves);
    if(this.isDeathSave){
      this.updateDeathSavePanel(players[this.playerId].deathSaves);
    }else{
      this.updatePanel(newHp);
    }
  }

  swapType(newHp, deathSaves){
    if(newHp <= 0 && this.hasDeathSaves() && !this.isDeathSave){
      this.makeDeathSavePanel();
    }else if(!this.hasDeathSaves() && this.isDeathSave){
      this.makePanel();
    }
  }

  hasDeathSaves(){
    return players[this.playerId].deathSaves[0] > 0 || players[this.playerId].deathSaves[1] > 0
  }

  updateDeathSavePanel(saves){}

  updatePanel(newHp){}

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




class NumberPanel extends Panel {

  makePanel(){
    var htmlstring = /*html*/`
                      <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="false" style="background-color: ${players[this.playerId].characterColor}; display: grid; grid-template: 1fr / 1fr 1fr">
                        <div class="playerImage">
                          <img src=${players[this.playerId].headShotImg} alt="headshot" class="headshotImg" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%;">
                          <!-- <div class="playerName">${players[this.playerId].characterName}</div> -->
                        </div>
                        <div class="hpNumber" style="display: flex; flex-direction: column; align-items: center;">
                          <h1>${players[this.playerId].currentHp}</h1>
                          <h4 class="tmpHp" style="display: ${players[this.playerId].tmpHp == 0 ? "none" : "block"}">+${players[this.playerId].tmpHp}</h4>
                        </div>
                      </div>
                    `;

    this.isDeathSave = false;
    return this.setPanel(htmlstring);
  }


  makeDeathSavePanel(){
    var emptySuccessImgscr = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
    var emptyFailImgscr = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
    var successImgscr = chrome.runtime.getURL("/hearts/successHeart.png");
    var failImgscr = chrome.runtime.getURL("/hearts/failHeart.png");

    var htmlstring = /*html*/`
                      <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="true" style="background-color: ${players[this.playerId].characterColor}; display: grid; grid-template: 50% 50% / 50% 16% 16% 16%;">
                        <div class="playerImage" style="grid-area: 1 / 1 / 3 / 2">
                          <img src=${players[this.playerId].headShotImg} alt="headshot" class="headshotImg" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%;">
                          <!-- <div class="playerName">${players[this.playerId].characterName}</div> -->
                        </div>

                        <img src=${successImgscr} alt="sHeart1" class="SuccessHeart" style="grid-area: 1 / 2 / 2 / 3; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${successImgscr} alt="sHeart2" class="SuccessHeart" style="grid-area: 1 / 3 / 2 / 4; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${successImgscr} alt="sHeart3" class="SuccessHeart" style="grid-area: 1 / 4 / 2 / 5; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${failImgscr}    alt="fHeart1" class="FailHeart"    style="grid-area: 2 / 2 / 3 / 3; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${failImgscr}    alt="fHeart2" class="FailHeart"    style="grid-area: 2 / 3 / 3 / 4; object-fit: contain; width: 100%; height: 100%;">
                        <img src=${failImgscr}    alt="fHeart3" class="FailHeart"    style="grid-area: 2 / 4 / 3 / 5; object-fit: contain; width: 100%; height: 100%;">

                      </div>
                    `;

    this.isDeathSave = true;
    this.setPanel(htmlstring);
    this.updateDeathSavePanel(players[this.playerId].deathSaves);
    return this.panel;
  }

  updateDeathSavePanel(saves){
    var successHearts = this.panel.getElementsByClassName("SuccessHeart");
    var failHearts = this.panel.getElementsByClassName("FailHeart");

    for(i=0; i<successHearts.length; i++){
      if(saves[0] >= i+1){ //successes
        successHearts[i].src = chrome.runtime.getURL("/hearts/successHeart.png");
      }else{
        successHearts[i].src = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
      }

      if(saves[1] >= i+1){
        failHearts[i].src = chrome.runtime.getURL("/hearts/failHeart.png");
      }else{
        failHearts[i].src = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
      }
    }
  }

  updatePanel(newHp){
    var playerPanel = this.panel.getElementsByTagName("h1")[0];
    playerPanel.innerText = newHp;

    var hpNum = this.panel.getElementsByClassName("hpNumber")[0];
    if(players[this.playerId].tmpHp > 0){ //add tmp hp number
      hpNum.lastElementChild.style.display = "block";
      hpNum.lastElementChild.innerHTML = "+" + players[this.playerId].tmpHp;
    }else if(hpNum.childElementCount > 1){
      hpNum.lastElementChild.style.display = "none";
      hpNum.lastElementChild.innerHTML = "";
    }
  }


}




class HeathbarPanel extends Panel {

  makePanel(){
    var htmlstring = /*html*/`
            <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="false" style="background-color: ${players[this.playerId].characterColor}; justify-content: center;">
              <div class="barFlexbox" style="display: flex; flex-direction: column; gap: 3px; align-items: flex-start; height: 80%; width: 90%">
                <div class="barPanelHeader" style="flex: 1; height: 45%; align-self: flex-start;">
                  <img src=${players[this.playerId].headShotImg} alt="headshot" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%; float: left; border-radius: 50%; margin: 0 3px 0 0;"></img>
                  <div class="barPlayerName" style="float: left; font-weight: bold;">${players[this.playerId].characterName}</div>
                </div>
                <div class="healthBar" style="flex: 1; height: 45%; width: 100%; position: relative; border: 1px solid #9e9a8d; border-radius: 3px">
                  <div class="barBackground" style="background-color: #723939; width: 100%; height: 100%; position: absolute; top: 0; left: 0; border-radius: 3px"></div>
                  <div class="slider hpSlider" style="background-color: rgb(54 82 54); width: ${Math.min(players[this.playerId].currentHp / charData[this.playerId].hp, 1) * 100}%;"></div>
                  <div class="slider tmpHpSlider" style="background-color: rgba(10, 100, 255, 0.4); width: ${Math.min(players[this.playerId].tmpHp / charData[this.playerId].hp, 1) * 100}%;"></div>
                  <div class="healthbarHpNum"><div>${players[this.playerId].currentHp + players[this.playerId].tmpHp}</div></div>
                </div>
              </div>
            </div>
          `;

    this.isDeathSave = false;
    return this.setPanel(htmlstring);
  }


  makeDeathSavePanel(){
    var emptySuccessImgscr = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
    var emptyFailImgscr = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
    var successImgscr = chrome.runtime.getURL("/hearts/successHeart.png");
    var failImgscr = chrome.runtime.getURL("/hearts/failHeart.png");

    var htmlstring = /*html*/`
            <div id=${"player"+this.playerId} class="playerPanel" data-deathSaves="false" style="background-color: ${players[this.playerId].characterColor}; justify-content: center;">
              <div class="barDeathSaveGrid">
                <div class="barPanelHeader" style="grid-area: 1 / 1 / 2 / 7; min-height: 0;">
                  <img src=${players[this.playerId].headShotImg} alt="headshot" referrerPolicy="no-referrer" crossorigin="anonymous" style="height: 100%; float: left; border-radius: 50%; margin: 0 3px 0 0;"></img>
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
    var slider = this.panel.getElementsByClassName("slider")[0];
    slider.style.width = (Math.min(newHp / charData[this.playerId].hp, 1) * 100) + "%";

    var hpNum = this.panel.getElementsByClassName("healthbarHpNum")[0];
    hpNum.firstElementChild.innerHTML = newHp + players[this.playerId].tmpHp;

    var tmpHpSlider = this.panel.getElementsByClassName("tmpHpSlider")[0];
    tmpHpSlider.style.width = (Math.min(players[this.playerId].tmpHp / charData[this.playerId].hp, 1) * 100) + "%";
  }

  updateDeathSavePanel(saves){
    var successHearts = this.panel.getElementsByClassName("SuccessHeart");
    var failHearts = this.panel.getElementsByClassName("FailHeart");

    for(i=0; i<successHearts.length; i++){
      if(saves[0] >= i+1){ //successes
        successHearts[i].src = chrome.runtime.getURL("/hearts/successHeart.png"); //TODO get fail and success heart urls at start and set as global var
      }else{
        successHearts[i].src = chrome.runtime.getURL("/hearts/emptySuccessHeart.png");
      }

      if(saves[1] >= i+1){
        failHearts[i].src = chrome.runtime.getURL("/hearts/failHeart.png");
      }else{
        failHearts[i].src = chrome.runtime.getURL("/hearts/emptyFailHeart.png");
      }
    }

  }


}



class PlayerChracter {
  id;
  characterName = "Name";
  level = 0;
  chracterClass = "Class";
  classLevels = {};
  armorClass = 0;
  maxHp = 0;
  stats = {"str":0, "dex":0, "con":0, "int":0, "wis":0, "cha":0};

  characterColor = "steelblue";
  headShotImg;

  currentHp;
  tmpHp = 0;
  deathSaves = [0,0]; //[numSuccess, numFailed]

  statsPanel;

  constructor(id, name, lvl, charClass, classLevels, ac, hp, stats, color, imgURL){
    this.id = id;
    this.characterName = name;
    this.level = lvl;
    this.chracterClass = charClass;
    this.classLevels = classLevels;
    this.armorClass = ac;
    this.maxHp = hp;
    this.currentHp = hp;
    this.stats = stats;
    this.characterColor = color;
    this.headShotImg = imgURL

    this.makePanel();
  }

  update(newHp, deathSaves){ //TODO is this being used?
    this.currentHp = newHp;
    this.deathSaves = deathSaves;

    panels[this.id].update();
  }

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
    if(this.statsPanel.getElementsByClassName(effectName.replace(/\s+/g, '')).length == 0){
      this.statsPanel.getElementsByClassName("EffectsBox")[0].insertAdjacentHTML("beforeend", /*html*/`
                                                                  <div class="effect ${effectName.replace(/\s+/g, '')}" style="background-color: ${this.characterColor};">
                                                                    <div class="effectInner" style="background-color: #606060; border: solid black 1px; padding: 0 2px">
                                                                      ${effectName}${level ? ": " + level : ""} 
                                                                    </div>
                                                                    <div class="tooltip">${effectDesc}</div>
                                                                  </div>
                                                                `);
    }else{
      let effectElem = this.statsPanel.getElementsByClassName(effectName.replace(/\s+/g, ''))[0];
      if(effectDesc){
        effectElem.lastElementChild.innerHTML = effectDesc;
      }
      if(level){
        effectElem.firstElementChild.textContent = effectName + ": " + level;
      }
    }
  }

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

  getClassLevelString(){
    console.log("get class levels")
    if(this.classLevels == undefined || Object.keys(this.classLevels).length === 0){
      return this.chracterClass + ": " + this.level;
    }else{
      console.log("multiple classes")
      return Object.entries(this.classLevels).map(([clazz, lvl]) => clazz + ": " + lvl).join("    ");
    }
  }

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

                      <div class="chracterStats" style="display: flex">

                        <table class="statsTable">
                          <tr>
                            <th>STR</td>
                            <td>${this.stats.str}</td>
                            <th>INT</td>
                            <td>${this.stats.int}</td>
                          </tr>
                          <tr>
                            <th>DEX</td>
                            <td>${this.stats.dex}</td>
                            <th>WIS</td>
                            <td>${this.stats.wis}</td>
                          </tr>
                          <tr>
                            <th>CON</td>
                            <td>${this.stats.con}</td>
                            <th>CHA</td>
                            <td>${this.stats.cha}</td>
                          </tr>
                        </table>

                        <div class="hp-ac" style="display: flex; flex-direction: column; justify-content: space-evenly; flex-grow: 1; align-items: center;">
                          <div class="statDiv" style="position: relative">
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
                          <div class="statDiv" style="position: relative;">
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
                    </div>
                  `;

    var tmp = document.createElement("div");
    tmp.innerHTML = panelStr;
    this.statsPanel = tmp.firstElementChild;

    return this.statsPanel;
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

  if(!isInTimeSlot(currentTime, currentTimeSlot)){

    console.log("new time slot");
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
        applyEvent(episodeData[i-1].event, false);
      }
      updateAllPanels();

    }else if(currentTimeSlot < oldTimeSlot){ //moved backwards - apply all events from the begining to the new time
      resetPlayers();
      for(i=1; i<=currentTimeSlot; i++){
        applyEvent(episodeData[i-1].event, false);
      }
      updateAllPanels();
    }


  }

}

function applyEvent(event, updateUI){
  if(event.type === "hpUpdate"){
    //console.log("hp update");
    if(event.hasOwnProperty("tmp") && event.tmp == true){
      getPlayer(event.characterName).addTmpHp(event.amount, updateUI);
    }else{
      getPlayer(event.characterName).updateHp(event.amount, updateUI);
    }

  }else if(event.type === "deathsave"){
    //console.log("deathsave");
    getPlayer(event.characterName).addDeathSave((event.saveType === "succeed"), (("amount" in event) ? event.amount : 1), updateUI);

  }else if(event.type === "longRest"){
    //console.log("longRest");
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
    nextInitiativeTurn();

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
  }
  endInitiative()
}

function startInitiative(order){
  initiativeOrder = order;
  currentInitiative = 0;
  for(let i=0; i<order.length; i++){
    let name = order[i];
    panel = panels[getPlayer(name).id].panel.parentElement;
    panel.style.order = i+1;
    panel.classList.add("initiative");
    if(i == currentInitiative){ panel.classList.add("initiativeCurrent"); }
  }
}

function endInitiative(){
  for(let panelObj of panels){
    panelObj.panel.parentElement.style.order = "";
    panelObj.panel.parentElement.classList.remove("initiative");
    panelObj.panel.parentElement.classList.remove("initiativeCurrent");
  }
  initiativeOrder = [];
  currentInitiative = 0;
}

function nextInitiativeTurn(){
  previousInitiativePanel = panels[getPlayer(initiativeOrder[currentInitiative]).id].panel.parentElement;
  previousInitiativePanel.classList.remove("initiativeCurrent");
  currentInitiative = (currentInitiative+1) % (initiativeOrder.length)
  nextInitiativePanel = panels[getPlayer(initiativeOrder[currentInitiative]).id].panel.parentElement;
  nextInitiativePanel.classList.add("initiativeCurrent");
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

                            <div id="trackerTitle" style="grid-area: title">
                              <h4>HP Tracker</h4>
                            </div>

                            <div id="menuContainer" style="grid-area: menuButton; float: right; box-sizing: border-box;">
                              <div id="menuButton" class="button" style="height: 100%; width: 100%;">
                                <img src=${chrome.runtime.getURL("icons/menuIcon-white.png")} style="height: 85%;">
                              </div>
                              ${makeMenu()}
                            </div>

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
              <img src="${chrome.runtime.getURL("icons/arrow-white.png")}" style="height: 12px;">
              <h4 class="submenuButton"> Orientation </h4>

              <div class="menuDropDown submenuDropdown">
                <div id="verticalButton" class="menuItem menuButton radioButton">
                  <h4>Vertical</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="height: 12px; display: ${(orientation === 'vertical') ? 'block' : 'none'};">
                </div>
                <div id="horizonalButton" class="menuItem menuButton radioButton">
                  <h4>Horizontal</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="height: 12px; display: ${(orientation === 'horizontal') ? 'block' : 'none'};">
                </div>
              </div>

            </div>

            <div id="DisplayOption" class="menuItem submenu">
            <img src="${chrome.runtime.getURL("icons/arrow-white.png")}" style="height: 12px;">
              <h4 class="submenuButton"> Display Type </h4>

              <div class="menuDropDown submenuDropdown">
                <div id="DisplayNumberButton" class="menuItem menuButton radioButton">
                  <h4>Number</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="height: 12px; display: ${(displayType === 'number') ? 'block' : 'none'};">
                </div>
                <div id="DisplayHealthbarButton" class="menuItem menuButton radioButton">
                  <h4>Healthbar</h4>
                  <img src="${chrome.runtime.getURL("icons/tick-white.png")}" style="height: 12px; display: ${(displayType === 'healthBar') ? 'block' : 'none'};">
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


  //check on the critical role channel
  document.addEventListener("yt-page-data-updated", function(event){
    if(!navFinished){return;} //only execute directly after a yt-navigate-finish event

    var name = document.querySelector("#meta-contents #channel-name a").text;
    console.log(name);

    if(name === "Critical Role"){

      //check on a campaign 3 video
      var videoTitle = document.getElementsByTagName("title")[0].textContent;
      var campaignNum = ((c = videoTitle.match(/(?<=Campaign\s)\d/g)) !== null) ? c[0] : 0; //get the campaign number or 0 if it cannot be found
      episodeNum = ((e = videoTitle.match(/(?<=Episode\s)\d+/g)) !== null) ? e[0] : 0; //get the episode number or 0 if it cannot be found

      if(campaignNum == 3 && episodeNum > 0){

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
    if((tracker = document.getElementById("trackerBlock")) !== null) tracker.remove();
    if(updateTimer !== null) clearInterval(updateTimer);

    minimised = false;
    episodeNum = 0;
    episodeData = null;
    charData = null;
    currentTimeSlot = 0;
    panels = [];
    players = [];
  });

}


function makeReloadButton(status, message){
  var tbody = document.getElementById("hpPanelsContainer");
  tbody.replaceChildren();

  console.warn("Unable to get data \t" + status + ": " + message);

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



//get get the episode data from the database
function getEpisodeData(successCallback, failCallback){
  var data = null;

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = false;

  document.getElementById("hpPanelsContainer").innerHTML = `<div class="spinner" style="width: 40px; height: 40px"></div>`;


  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      try{
        console.log("restdb responded");

        console.log(this.responseText);
        console.log(this.status);

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
        console.error(e.name + ": " + e.message);
        episodeData = null;
        charData = null;
      }

    }
  });

  xhr.open("GET", "https://testdb-2091.restdb.io/rest/combat-data?q={\"EpNum\": " + episodeNum + "}"); //q={\"EpNum\": " + episodeNum + "}
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


InjectHTML();
