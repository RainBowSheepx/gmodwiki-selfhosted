// Individual method pages for systems and entities, entity pages, and the
// regenerated system/entities overview pages. Published last, so the system
// pages here override the earlier bullet-list versions from pages_systems.mjs.
import { readFileSync } from "fs";
import { fnMarkup, UNSURE, GITHUB_REPO } from "./gen.mjs";

const SIGS = JSON.parse(readFileSync(new URL("signatures.json", import.meta.url), "utf8"));

export const methodPages = [];

/* ---------------- argument type heuristics ---------------- */

const ARG_TYPES = {
  ply: "Player", pl: "Player",
  ent: "Entity", bus: "Entity", troll: "Entity", wheel: "Entity", seat: "Entity", mirror: "Entity",
  active: "boolean", on: "boolean", gen: "boolean", inverted: "boolean", disabled: "boolean",
  charging: "boolean", force: "boolean", loop: "boolean", isnext: "boolean", released: "boolean",
  right: "boolean", invert: "boolean", translucent: "boolean", stopped: "boolean", init: "boolean",
  enabled: "boolean", full: "boolean",
  amperage: "number", rotation: "number", fr: "number", state: "number", mp: "number", value: "number",
  dist: "number", volume: "number", time: "number", route: "number", pressure: "number", air: "number",
  brake: "number", speed: "number", index: "number", id: "number", x: "number", y: "number", w: "number",
  h: "number", scale: "number", drawscale: "number", dt: "number", len: "number", num: "number",
  spd: "number", ang2: "number",
  name: "string", var: "string", snd: "string", btn: "string", type2: "string",
  data: "table", tab: "table", circuit: "table", cfg: "table", tr: "table", dmginfo: "table",
  pos: "Vector", lpos: "Vector", wheelpos: "Vector", goal: "Vector",
  ang: "Angle",
  "...": "vararg",
};

function argType(name) {
  const key = name.toLowerCase();
  if (ARG_TYPES[key]) return ARG_TYPES[key];
  if (key.startsWith("is") || key.startsWith("should") || key.startsWith("has")) return "boolean";
  if (key.endsWith("pos")) return "Vector";
  if (key.endsWith("ang")) return "Angle";
  if (key.endsWith("time") || key.endsWith("speed") || key.endsWith("count") || key.endsWith("fraction")) return "number";
  if (key.endsWith("name") || key.endsWith("sound")) return "string";
  if (key.endsWith("data") || key.endsWith("table")) return "table";
  if (key.endsWith("ent") || key.endsWith("entity")) return "Entity";
  return "any";
}

function parseArgs(argString) {
  if (!argString || !argString.trim()) return [];
  return argString.split(",").map((raw) => {
    const name = raw.trim();
    return [name === "..." ? "arguments" : name, argType(name), ""];
  });
}

/* ---------------- lifecycle annotations ---------------- */

const LIFECYCLE = {
  Initialize: "Called when the instance is created.",
  Think: "Called periodically to update the state.",
  OnRemove: "Called when the owner entity is removed.",
  Unload: "Called when the system instance is unloaded; clears its networked variables.",
  OnReload: "Called when the system definition is re-registered (e.g. after a Lua refresh).",
  Setup: "Internal: creates the panels, buttons and models of the device on the bus.",
  SetupUnload: "Internal: removes the panels and buttons created by Setup.",
  Draw: "Standard rendering hook of the entity.",
  DrawTranslucent: "Standard translucent-pass rendering hook of the entity.",
  SetupDataTables: "Standard hook: declares the entity's networked DT variables.",
  SetupDataTablesSV: "Internal: declares additional serverside DT variables.",
  NotifyShouldTransmit: "Standard hook: called when the entity enters/leaves the client's PVS.",
  SpawnFunction: "Standard spawn-menu spawn function.",
  CanProperty: "Standard hook: controls which context-menu properties are allowed.",
  PhysicsSimulate: "Standard physics simulation hook.",
  PhysicsUpdate: "Standard physics update hook.",
  Use: "Standard hook: called when a player presses USE on the entity.",
  GetNWVar: "Returns an addon networked variable of this entity (see <page text=\"NetworkSystem\">Trolleybus_System.NetworkSystem</page>).",
  SetNWVar: "Sets an addon networked variable on this entity.",
  UpdateTransmitState: "Internal: distance/PVS based transmit control.",
  TransmitUpdate: "Internal: distance/PVS based transmit control.",
  UpdateClientEnts: "Internal: updates the clientside detail entities.",
  CreateClientEnts: "Internal: creates the clientside detail entities.",
  ClearClientEnts: "Internal: removes the clientside detail entities.",
};

/* ---------------- system method annotations ---------------- */

const S = {};

S.accumulatorbattery = {
  SetActive: "Toggles the battery switch.",
  IsActive: "Returns whether the battery is switched on.",
  GetChargePercent: "Returns the remaining charge, 0-100.",
  SetCharging: "Marks the battery as being recharged from the low-voltage source.",
  GetCharging: "Returns whether the battery is recharging.",
  SetCircuit: "Sets the low-voltage electric circuit the battery feeds.",
  GetCircuit: "Returns the battery's electric circuit.",
  SetCircuitUsageDisabled: "Temporarily excludes the battery from the circuit." + UNSURE,
  GetLastAmperage: "Returns the last computed output amperage.",
  GetLastVoltage: "Returns the last computed output voltage.",
  GetLowVoltage: "Returns the current low-voltage output of the battery.",
};

S.engine = {
  SetAmperage: "Sets the incoming amperage that accelerates the rotor.",
  GetAmperage: "Returns the current amperage.",
  SetAsGenerator: "Switches the motor into generator (electric brake) mode.",
  SetBrakeFraction: "Sets the braking force fraction used in generator mode.",
  SetInverted: "Inverts the rotation direction (reverse).",
  SetRotation: "Sets the rotor rotation speed (networked).",
  GetRotation: "Returns the rotor rotation speed.",
  GetResistance: "Returns the motor resistance for the electric circuit.",
  GetMoveSpeed: "Returns the bus speed derived from the rotor rotation.",
  PreDriveWheelsRotationUpdate: "Hook into the bus wheel-rotation update: applies engine rotation to the drive wheels.",
};

S.reductor = {
  SetRotation: "Sets the input shaft rotation.",
  GetRotation: "Returns the input shaft rotation.",
  GetWheelsControl: "Returns how the rotation maps to the drive wheels." + UNSURE,
  GetLastDifference: "Returns the difference between engine and wheels rotation (used for gear sounds)." + UNSURE,
  GetLastDifferenceLerped: "Smoothed version of GetLastDifference." + UNSURE,
  PostDriveWheelsRotationUpdate: "Hook into the bus wheel-rotation update after the drive is applied.",
};

S.pneumatic = {
  SetMotorCompressorActive: "Toggles the motor-compressor.",
  IsMotorCompressorActive: "Returns whether the motor-compressor is running.",
  ShouldBeMotorCompressorActive: "Pressure regulator: whether the compressor should run right now.",
  GetAir: "Returns the current air amount in the tanks.",
  SetAir: "Sets the air amount in the tanks.",
  GetBrakePressure: "Returns the pressure available to the brakes.",
  SetBrake: "Sets the brake application fraction.",
  GetBrake: "Returns the brake application fraction.",
  GetBrakeControlFraction: "Returns how far the brake pedal circuit is applied." + UNSURE,
  GetWheelsBrake: "Returns the resulting wheel brake force.",
  CanDoorsMove: "Returns whether there is enough air for the doors to move.",
  ModifyDoorsSpeed: "Scales the door movement speed by the available air.",
  OnDoorMove: "Called when a door moves; consumes air.",
};

S.handbrake = {
  SetActive: "Engages or releases the handbrake.",
  GetWheelsBrake: "Returns the brake force applied to the wheels.",
  GetAirFromSystem: "Air usage integration with the pneumatic system." + UNSURE,
  UpdatePneumaticAir: "Air usage integration with the pneumatic system." + UNSURE,
};

S.hydraulic_booster = {
  SetAmperage: "Sets the pump motor current.",
  GetAmperage: "Returns the pump motor current.",
  GetPowerFraction: "Returns how much boost the pump currently provides.",
  GetSteerBoosterPowerFraction: "Returns the steering assistance fraction used by the steering code.",
};

S.staticvoltageconverter = {
  SetActive: "Toggles the converter.",
  IsActive: "Returns whether the converter is on.",
  GetVoltage: "Returns the output voltage.",
  GetLowVoltage: "Returns the low-voltage output.",
  SetCircuit: "Sets the low-voltage circuit the converter feeds.",
};

S.motor_ventilator = {
  SetActive: "Toggles the ventilator.",
  IsActive: "Returns whether the ventilator is running.",
  GetVoltage: "Returns the generator output voltage.",
  GetLowVoltage: "Returns the low-voltage output.",
  SetCircuit: "Sets the low-voltage circuit the generator feeds.",
};

S.rksu = {
  ControlPedals: "Translates the pedals into group-controller positions.",
  GetPosition: "Returns the current controller position.",
  GetResistance: "Returns the resistance currently inserted into the traction circuit.",
  SetEngineAmperage: "Passes the computed amperage to the engine.",
  IsEngineAsGenerator: "Returns whether the engine is in generator (brake) mode.",
  GetEngineBrakeFraction: "Returns the electric brake force fraction.",
  SetContactorsActive: "Sets the line contactors state.",
  PlayContactorSound: "Plays a contactor click sound.",
  HUDPaint: "Debug/HUD drawing." + UNSURE,
};

S.tisu = {
  ControlPedals: "Translates the pedals into control output.",
  GetResistance: "Returns the traction circuit resistance.",
  SetEngineAmperage: "Passes the computed amperage to the engine.",
  GetEngineAmperage: "Returns the amperage requested from the engine.",
  SetEngineRotation: "Engine rotation integration.",
  GetEngineRotation: "Returns the engine rotation used by the control system.",
  IsEngineAsGenerator: "Returns whether the engine is in generator (brake) mode.",
  GetEngineBrakeFraction: "Returns the electric brake force fraction.",
  SetContactorsActive: "Sets the line contactors state.",
  PlayContactorSound: "Plays a contactor click sound.",
  SetTISUBlockActive: "Enables/disables the TISU block." + UNSURE,
};

S.trsu = {
  ControlPedals: "Translates the pedals into control output.",
  GetResistance: "Returns the traction circuit resistance.",
  SetEngineAmperage: "Passes the computed amperage to the engine.",
  GetEngineAmperage: "Returns the amperage requested from the engine.",
  IsEngineAsGenerator: "Returns whether the engine is in generator (brake) mode.",
  GetEngineBrakeFraction: "Returns the electric brake force fraction.",
};

S.heater = S.interior_heater = {
  SetState: "Sets the heater mode.",
  GetState: "Returns the heater mode.",
  SetVentActive: "Toggles the vent fan.",
  IsVentActive: "Returns whether the vent fan is running.",
};

S.horn = {
  ShouldActive: "Returns whether the horn should sound right now (horn button held and power available).",
};

S.buzzer = {
  SetActive: "Sets the buzzer state.",
  IsActive: "Returns whether the buzzer is sounding.",
};

S.nameplates = {
  SetRoute: "Sets the current route shown on the plates.",
  GetRoute: "Returns the current route.",
  GetPrevRoute: "Returns the previous route key for cycling.",
  GetNextRoute: "Returns the next route key for cycling.",
  GetRouteName: "Returns the displayed route name (see <page text=\"Routes\">Trolleybus_System.Routes</page>).",
  GetRouteStart: "Returns the displayed start-stop name.",
  GetRouteEnd: "Returns the displayed end-stop name.",
  DrawRoute: "Draws a route plate.",
};

S.multiscreen = {
  EnableScreen: "Powers the screen on." + UNSURE,
  DisableScreen: "Powers the screen off." + UNSURE,
  IsScreenDisabled: "Returns whether the screen is off." + UNSURE,
  LoadScreen: "Loads screen content." + UNSURE,
  UnloadScreen: "Unloads screen content." + UNSURE,
};

S.agit_132 = {
  SetActive: "Powers the device on/off.",
  IsActive: "Returns whether the device is powered.",
  SetRoute: "Sets the selected informator route.",
  GetRoute: "Returns the selected informator route.",
  SetRouteState: "Enables/disables the route selection mode.",
  IsRouteState: "Returns whether the device is in route selection mode.",
  OnChangeButtonPressed: "Front-panel button: cycles the selected route/announcement.",
  OnPlayButtonPressed: "Front-panel button: plays the current announcement.",
  OnEditButtonPressed: "Front-panel button: edit mode." + UNSURE,
  PlaySound: "Plays an announcement sound in the bus.",
  StopSound: "Stops the current announcement.",
  IsPlaying: "Returns whether an announcement is playing.",
  GetStopText: "Returns the text shown for the current stop." + UNSURE,
  DrawScreen: "Clientside: renders the device screen.",
};

S.ir_2002 = {
  SetActive: "Powers the device on/off.",
  IsActive: "Returns whether the device is powered.",
  SetRoute: "Sets the selected informator route.",
  GetRoute: "Returns the selected informator route.",
  SetRouteState: "Enables/disables the route selection mode.",
  IsRouteState: "Returns whether the device is in route selection mode.",
  OnChangeButtonPressed: "Front-panel button: cycles the selected route/announcement.",
  PlaySound: "Plays an announcement sound in the bus.",
  StopSound: "Stops the current announcement.",
  DrawDigits: "Clientside: renders the digit display.",
};

/* ---------------- system registry ---------------- */

const SYSTEMS = [
  ["accumulatorbattery", "AccumulatorBattery"],
  ["agit_132", "Agit-132"],
  ["buzzer", "Buzzer"],
  ["engine", "Engine"],
  ["handbrake", "Handbrake"],
  ["heater", "Heater"],
  ["horn", "Horn"],
  ["hydraulic_booster", "HydraulicBooster"],
  ["interior_heater", "InteriorHeater"],
  ["ir_2002", "IR-2002"],
  ["motor_ventilator", "MotorVentilator"],
  ["multiscreen", "MultiScreen"],
  ["nameplates", "Nameplates"],
  ["pneumatic", "Pneumatic"],
  ["reductor", "Reductor"],
  ["rksu", "RKSU"],
  ["staticvoltageconverter", "StaticVoltageConverter"],
  ["tisu", "TISU"],
  ["trsu", "TRSU"],
];

const SYSTEM_INFO = {
  AccumulatorBattery: ["all trolleybuses (and the ZiU-6205 trailer)", "The 24V accumulator battery: powers the low-voltage circuit when no other source is active and recharges from it otherwise."],
  "Agit-132": ["AKSM-321/321N, AKSM-333/333O, Trolza-5265", "AGIT-132 — the electronic informator device of modern buses: shows the current route and plays stop announcements from the <page text=\"informator data\">Trolleybus_System_Informators</page>."],
  Buzzer: ["all trolleybuses", "The cabin buzzer used to signal the driver."],
  Engine: ["all trolleybuses", "The traction electric motor: converts amperage from the control system into wheel rotation and acts as a generator during electric braking."],
  Handbrake: ["all trolleybuses", "The parking (hand) brake."],
  Heater: ["all trolleybuses", "The driver cabin heater with a vent fan."],
  Horn: ["all trolleybuses", "The horn."],
  HydraulicBooster: ["all trolleybuses", "The power steering pump: without it steering is slow and heavy."],
  InteriorHeater: ["ZiU-6205", "Passenger compartment heaters."],
  "IR-2002": ["AKSM-101PS, ZiU-6205", "IR-2002 — the digit-display informator device of older buses; plays stop announcements from the <page text=\"informator data\">Trolleybus_System_Informators</page>."],
  MotorVentilator: ["ZiU-682V-013, ZiU-6205 (and its trailer)", "The motor-ventilator: its generator feeds the 24V low-voltage network on older buses."],
  MultiScreen: ["Trolza-5265", "The multimedia passenger screen of the Trolza-5265 Megapolis."],
  Nameplates: ["ZiU-682V-013, ZiU-6205 (and trailer), AKSM-101PS", "Route nameplates of classic buses (front/side/rear plates with route number and endpoints)."],
  Pneumatic: ["all trolleybuses", "The air system: motor-compressor, tanks, brakes and doors."],
  Reductor: ["all trolleybuses", "The rear-axle reducer between the engine and the wheels."],
  RKSU: ["ZiU-682V-013, AKSM-101PS", "RKSU — the resistor-contactor control system of classic trolleybuses."],
  StaticVoltageConverter: ["AKSM-101PS, AKSM-321/321N, AKSM-333/333O, Trolza-5265", "The static voltage converter: makes the 24V low-voltage network from the 550V line on newer buses."],
  TISU: ["ZiU-6205", "TISU — the thyristor-pulse control system: smooth stepless engine current control."],
  TRSU: ["AKSM-321/321N, AKSM-333/333O, Trolza-5265", "TRSU — the transistor (IGBT) control system of modern buses with regenerative braking."],
};

/* ---------------- generate system method pages + system pages ---------------- */

for (const [dir, sysName] of SYSTEMS) {
  const sigs = SIGS.systems[dir] ?? {};
  const docs = S[dir] ?? {};
  const catPath = `Trolleybus System/Systems/${sysName}`;
  const pageAddr = `Systems/${sysName}`;

  const methodLinks = [];

  for (const [mName, sig] of Object.entries(sigs)) {
    const desc = docs[mName] ?? LIFECYCLE[mName] ?? ("Internal method of the " + sysName + " system." + UNSURE);
    const args = parseArgs(sig.args);

    methodPages.push({
      address: `${pageAddr}/${mName}`,
      title: mName,
      category: catPath,
      markup: fnMarkup({
        name: mName,
        parent: sysName,
        parentlink: pageAddr,
        type: "classfunc",
        realm: sig.realm,
        desc,
        args,
      }),
    });

    methodLinks.push(`* <page text="${mName}">${pageAddr}/${mName}</page> — ${desc}`);
  }

  const [buses, sysDesc] = SYSTEM_INFO[sysName];

  methodPages.push({
    address: pageAddr,
    title: sysName,
    category: catPath,
    markup: `# ${sysName}

${sysDesc}

**Used by:** ${buses}

Get the instance from a bus with <page text="Trolleybus:GetSystem">Trolleybus:GetSystem</page>(\`"${sysName}"\`). Every system also inherits the base methods \`SetNWVar\`/\`GetNWVar\`/\`ClearNWVars\`/\`Unload\` — see the <page text="systems guide">Trolleybus_System_Systems</page>.

<methods/>`,
  });
}

/* ---------------- entity pages ---------------- */

const E = {};

E.trolleybus_stop = {
  desc: "A route stop: spawned automatically from the route data (see <page text=\"Routes\">Trolleybus_System.Routes</page>), it spawns waiting passengers, detects arriving trolleybuses on the right routes and exchanges passengers with them. Fires the <page text=\"Stop_TrolleybusArrived\">TrolleybusSystem_Stop_TrolleybusArrived</page> and <page text=\"Stop_TrolleybusLeft\">TrolleybusSystem_Stop_TrolleybusLeft</page> events.",
  docs: {
    OnTrolleybusArrived: "Called when a trolleybus stops within the stop bounds; starts the passenger exchange and fires the Stop_TrolleybusArrived event.",
    OnTrolleybusLeft: "Called when the trolleybus departs; fires the Stop_TrolleybusLeft event.",
    UpdateData: "Applies a stop-data table (position, name, routes, size) to the entity.",
    GetRoutes: "Returns the routes serving this stop.",
    GetSize: "Returns the stop zone size.",
    SetSize: "Sets the stop zone size.",
    GetSquare: "Returns the stop zone area." + UNSURE,
    GetMaxPassCount: "Returns the maximum number of waiting passengers." + UNSURE,
    GetPassCountMult: "Returns the passenger count multiplier." + UNSURE,
    GetPassengersForTrolleybus: "Returns how many waiting passengers would board the given trolleybus.",
    GetRandomPassPos: "Returns a random passenger position within the stop zone." + UNSURE,
    GetSpawnPassPos: "Returns a spawn position for a passenger." + UNSURE,
    CanPassReachGoal: "Checks whether a passenger can walk to the goal position." + UNSURE,
    MovePass: "Moves a clientside passenger model." + UNSURE,
    IsTrolleybusInBounds: "Returns whether the trolleybus stands within the stop zone.",
    IsTrolleybusRouteRight: "Returns whether the trolleybus route is served by this stop.",
    SetupTrolleybuses: "Internal: tracks trolleybuses inside the stop zone.",
    Distance: "Returns the distance from the stop to the given position." + UNSURE,
  },
};

E.trolleybus_trafficlight = {
  desc: "A configurable traffic light: its type (lens layout and behaviour) comes from the registered <page text=\"traffic light types\">TrolleybusSystem_RegisterTrafficLightTypes</page>; placed and wired with the \`trolleytrafficlighteditor\` tool. AI <page text=\"traffic cars\">trolleybus_traffic_car</page> obey its stop signals.",
  docs: {
    SetupType: "Applies the registered traffic light type to the entity.",
    SetLense: "Sets the state of a lense (section).",
    GetLense: "Returns the state of a lense.",
    GetLenseData: "Returns the definition of a lense.",
    OnLenseUpdate: "Called when a lense changes.",
    SwitchState: "Advances the light to the next state of its behaviour cycle.",
    UpdateState: "Recomputes the current state.",
    GetStateUpdateTime: "Returns when the state last changed." + UNSURE,
    LoadBehaviour: "Loads the behaviour (phase timing) table.",
    IsStopSignal: "Returns whether the light currently shows a stop signal for the given direction.",
    LightType: "Returns the registered type definition of this light." + UNSURE,
    DrawSprites: "Clientside: draws the glow sprites of lit lenses.",
    DrawFullLense: "Clientside: draws a full lense." + UNSURE,
    DrawLenseSprite: "Clientside: draws a single lense sprite." + UNSURE,
    UpdateLenseModels: "Clientside: updates the lense models.",
    ClearLenseModels: "Clientside: removes the lense models.",
  },
};

E.trolleybus_traffic_car = {
  desc: "An AI traffic vehicle: drives along the traffic tracks (see <page>Trolleybus_System.GetTrafficTracks</page>), obeys traffic lights, avoids obstacles and other cars. Vehicle models are registered via the <page text=\"RegisterTrafficVehicles\">TrolleybusSystem_RegisterTrafficVehicles</page> hook; spawning is governed by the \`trolleybus_traffic_*\` admin settings.",
  docs: {
    ControlAI: "Main AI think: follows the track, brakes for obstacles and lights.",
    FindTrack: "Finds the nearest traffic track to start driving on.",
    GetTrack: "Returns the current track.",
    GetNextTrack: "Returns the next track after the current one.",
    SelectNextTrack: "Chooses the next track at a junction.",
    IsOnTrack: "Returns whether the car is still on its track.",
    MoveTo: "Steers the car towards the given position.",
    GetAllowedSpeed: "Returns the speed limit for the current situation.",
    GetSpeed: "Returns the current speed.",
    SetSpeed: "Sets the target speed.",
    GetMoveSpeed: "Returns the current movement speed.",
    SetupVehicleClass: "Applies the registered traffic vehicle type.",
    GetVehicleData: "Returns the registered vehicle type data.",
    SetupWheels: "Creates the car's wheels.",
    SetupJamTrace: "Internal: sets up the obstacle trace." + UNSURE,
    TraceHull: "Performs the obstacle hull trace." + UNSURE,
    GetTraceDistance: "Returns the obstacle trace length." + UNSURE,
    GetTracingPos: "Returns the obstacle trace origin." + UNSURE,
    GetTrackingPos: "Returns the position used for track following." + UNSURE,
    IsObstacleEnt: "Returns whether the entity counts as an obstacle.",
    IsLookAroundEnt: "Returns whether the entity should be steered around." + UNSURE,
    CalculateCollisionTimePos: "Predicts a collision time/position with another car." + UNSURE,
    CheckLoopStuck: "Detects being stuck in a loop." + UNSURE,
    GetSqrDistToStop: "Returns the squared distance to the stop point." + UNSURE,
    GetSurfaceFriction: "Returns the surface friction under the car." + UNSURE,
    WheelsIsOnGround: "Returns whether the wheels touch the ground.",
    IsWheelsFullStop: "Returns whether the wheels have fully stopped.",
    CalcWheelFinalRotationSpeed: "Computes the wheel rotation from the movement.",
    SetRotate: "Sets the wheel steering angle." + UNSURE,
    SetRotateTo: "Sets the target steering angle." + UNSURE,
    DrawSprites: "Clientside: draws the light sprites.",
  },
};

E.trolleybus_polecatcher = {
  desc: "A pole catcher mounted over the wires: when a trolleybus drives under it with lowered poles, it guides the pole heads back onto the contact wires. Placed with the contact network editor.",
  docs: {
    SetupMovePole: "Internal: starts guiding a pole onto the wire.",
    ComputeDesiredPoleAngle: "Computes the pole angle needed to reach the wire." + UNSURE,
    UpdateMoveNearAng: "Internal: updates the guiding animation." + UNSURE,
    CheckRopeCollision: "Checks the catcher rope collision with a pole." + UNSURE,
  },
};

E.trolleybus_wheel = {
  desc: "A physical wheel of a trolleybus or traffic car, created by <page>Trolleybus_System.CreateWheel</page> and held by rope/elastic constraints as suspension. Wheel types (model, size, sounds) come from the wheel types registry. Networked DT variables provide \`GetVehicle\`/\`SetVehicle\`, \`GetType\`/\`SetType\`, \`GetRotate\`/\`SetRotate\`, \`GetInvertRotation\`/\`SetInvertRotation\`.",
  docs: {
    SetupType: "Applies the registered wheel type (model, radius).",
    GetWheelData: "Returns the registered wheel type data.",
    CalcFinalRotationSpeed: "Computes the visual rotation speed.",
    MovementSpeedToRotationSpeed: "Converts linear speed into rotation speed for this wheel.",
    RotationSpeedToMovementSpeed: "Converts rotation speed into linear speed.",
    GetAllConnectedWheels: "Returns all wheels of the same vehicle." + UNSURE,
    GetBodyGroup: "Returns a bodygroup of the wheel model." + UNSURE,
    SetBodyGroup: "Sets a bodygroup of the wheel model." + UNSURE,
  },
};

const ENT_CAT = "Trolleybus System/Entities";

for (const [cls, info] of Object.entries(E)) {
  const sigs = SIGS.entities[cls] ?? {};
  const links = [];

  for (const [mName, sig] of Object.entries(sigs)) {
    const desc = info.docs[mName] ?? LIFECYCLE[mName] ?? ("Internal method of the " + cls + " entity." + UNSURE);
    const args = parseArgs(sig.args);

    methodPages.push({
      address: `${cls}:${mName}`,
      title: `${cls}:${mName}`,
      category: `${ENT_CAT}/${cls}`,
      markup: fnMarkup({ name: mName, parent: cls, type: "classfunc", realm: sig.realm, desc, args }),
    });

    links.push(`* <page text="${mName}">${cls}:${mName}</page> — ${desc}`);
  }

  methodPages.push({
    address: cls,
    title: cls,
    category: `${ENT_CAT}/${cls}`,
    markup: `# ${cls}

${info.desc}

<methods/>`,
  });
}

methodPages.push({
  address: "trolleybus_networkhelper",
  title: "trolleybus_networkhelper",
  category: ENT_CAT,
  markup: `# trolleybus_networkhelper

An invisible helper entity used by the <page text="NetworkSystem">Trolleybus_System.NetworkSystem</page> to carry global networked variables not tied to any real entity: <page>Trolleybus_System.NetworkSystem.SetHelperVar</page> creates one per helper index on demand.`,
});

methodPages.push({
  address: "trolleybus_clicker",
  title: "trolleybus_clicker",
  category: ENT_CAT,
  markup: `# trolleybus_clicker

The "clicker" weapon (SWEP). Holding it lets a player press trolleybus cabin buttons from outside the driver seat (see <page>Trolleybus_System.CanPressButtons</page>), and it carries the removable reverse handle between buses: pulling the handle from a <page text="reverse switch">Trolleybus_System.BuildReverseButton</page> stores its number and type on the weapon until it is inserted into another bus.`,
});

/* ---------------- trolleybus entity pages ---------------- */

const BUS_CAT = "Trolleybus System/Entities";

const BUSES = [
  ["trolleybus_ent_ziu682v013", "ZiU-682V-013", "The classic Soviet/Russian high-floor trolleybus — the most widespread model of the former USSR. Uses the resistor-contactor control system.",
    ["RKSU", "MotorVentilator", "Nameplates"], null],
  ["trolleybus_ent_ziu6205", "ZiU-6205", "The articulated (two-section) high-floor trolleybus; the second section is the \`trolleybus_ent_ziu6205_trailer\` entity. Uses the thyristor-pulse control system.",
    ["TISU", "MotorVentilator", "IR-2002", "Nameplates", "InteriorHeater"], "trolleybus_ent_ziu6205_trailer"],
  ["trolleybus_ent_aksm101ps", "AKSM-101PS", "The first-generation Belkommunmash trolleybus, close to the ZiU-682 design. Uses the resistor-contactor control system.",
    ["RKSU", "StaticVoltageConverter", "IR-2002", "Nameplates"], null],
  ["trolleybus_ent_aksm321", "AKSM-321", "The low-floor Belkommunmash trolleybus with a transistor control system.",
    ["TRSU", "StaticVoltageConverter", "Agit-132"], null],
  ["trolleybus_ent_aksm321n", "AKSM-321N", "A modernized variant of the AKSM-321." + UNSURE,
    ["TRSU", "StaticVoltageConverter", "Agit-132"], null],
  ["trolleybus_ent_aksm333", "AKSM-333", "The articulated low-floor Belkommunmash trolleybus; the second section is the \`trolleybus_ent_aksm333_trailer\` entity.",
    ["TRSU", "StaticVoltageConverter", "Agit-132"], "trolleybus_ent_aksm333_trailer"],
  ["trolleybus_ent_aksm333o", "AKSM-333O", "A variant of the articulated AKSM-333; the second section is the \`trolleybus_ent_aksm333o_trailer\` entity." + UNSURE,
    ["TRSU", "StaticVoltageConverter", "Agit-132"], "trolleybus_ent_aksm333o_trailer"],
  ["trolleybus_ent_aksm333o_msk", "AKSM-333O (Moscow)", "The Moscow variant of the AKSM-333O with city-specific equipment and skins." + UNSURE,
    ["TRSU", "StaticVoltageConverter", "Agit-132"], "trolleybus_ent_aksm333o_trailer"],
  ["trolleybus_ent_trolza5265", "Trolza-5265 \"Megapolis\"", "The Russian low-floor trolleybus with a transistor control system and a multimedia passenger screen.",
    ["TRSU", "StaticVoltageConverter", "Agit-132", "MultiScreen"], null],
];

const COMMON_SYSTEMS = `<page text="AccumulatorBattery">Systems/AccumulatorBattery</page>, <page text="Engine">Systems/Engine</page>, <page text="Reductor">Systems/Reductor</page>, <page text="Pneumatic">Systems/Pneumatic</page>, <page text="Handbrake">Systems/Handbrake</page>, <page text="HydraulicBooster">Systems/HydraulicBooster</page>, <page text="Heater">Systems/Heater</page>, <page text="Horn">Systems/Horn</page>, <page text="Buzzer">Systems/Buzzer</page>`;

for (const [cls, name, desc, systems, trailer] of BUSES) {
  const sysLinks = systems.map((s) => `<page text="${s}">Systems/${s}</page>`).join(", ");

  methodPages.push({
    address: cls,
    title: name,
    category: BUS_CAT,
    markup: `# ${name}

${desc}

* **Class:** \`${cls}\` (inherits \`trolleybus_ent_base\`)
${trailer ? `* **Trailer section:** \`${trailer}\`\n` : ""}* **API:** the full driving/buttons/poles API is inherited from the base class — see the <page text="Trolleybus class">Trolleybus</page>
* **Systems:** ${sysLinks} — plus the common set: ${COMMON_SYSTEMS}

Spawn settings (reducer type, doors, skins and more) are chosen in the spawn menu and read with <page text="GetSpawnSetting">Trolleybus:GetSpawnSetting</page>. Liveries are registered per class via <page>Trolleybus_System.AddTrolleybusSkin</page>.`,
  });
}

/* ---------------- updated entities overview ---------------- */

methodPages.push({
  address: "Trolleybus_System_Entities",
  title: "Trolleybus entities",
  category: "Trolleybus System",
  markup: `# Entity classes

## Drivable trolleybuses

All inherit from \`trolleybus_ent_base\` (see the <page text="Trolleybus class">Trolleybus</page>); each model has its own page with details and systems. Trailer sections inherit from \`trolleybus_ent_base_trailer\`.

| Class | Vehicle |
|-------|---------|
| <page text="trolleybus_ent_ziu682v013">trolleybus_ent_ziu682v013</page> | ZiU-682V-013 |
| <page text="trolleybus_ent_ziu6205">trolleybus_ent_ziu6205</page> (+ \`_trailer\`) | ZiU-6205 |
| <page text="trolleybus_ent_aksm101ps">trolleybus_ent_aksm101ps</page> | AKSM-101PS |
| <page text="trolleybus_ent_aksm321">trolleybus_ent_aksm321</page> / <page text="aksm321n">trolleybus_ent_aksm321n</page> | AKSM-321 |
| <page text="trolleybus_ent_aksm333">trolleybus_ent_aksm333</page> (+ \`_trailer\`) | AKSM-333 |
| <page text="trolleybus_ent_aksm333o">trolleybus_ent_aksm333o</page> / <page text="aksm333o_msk">trolleybus_ent_aksm333o_msk</page> (+ \`_trailer\`) | AKSM-333O |
| <page text="trolleybus_ent_trolza5265">trolleybus_ent_trolza5265</page> | Trolza-5265 "Megapolis" |

## Systems per trolleybus

Every bus loads <page text="AccumulatorBattery">Systems/AccumulatorBattery</page>, <page text="Engine">Systems/Engine</page>, <page text="Reductor">Systems/Reductor</page>, <page text="Pneumatic">Systems/Pneumatic</page>, <page text="Handbrake">Systems/Handbrake</page>, <page text="HydraulicBooster">Systems/HydraulicBooster</page>, <page text="Heater">Systems/Heater</page>, <page text="Horn">Systems/Horn</page> and <page text="Buzzer">Systems/Buzzer</page>. On top of that:

| Trolleybus | Control system | Low voltage | Informator | Other |
|------------|----------------|-------------|------------|-------|
| <page text="ZiU-682V-013">trolleybus_ent_ziu682v013</page> | <page text="RKSU">Systems/RKSU</page> | <page text="MotorVentilator">Systems/MotorVentilator</page> | — | <page text="Nameplates">Systems/Nameplates</page> |
| <page text="ZiU-6205">trolleybus_ent_ziu6205</page> | <page text="TISU">Systems/TISU</page> | <page text="MotorVentilator">Systems/MotorVentilator</page> | <page text="IR-2002">Systems/IR-2002</page> | <page text="Nameplates">Systems/Nameplates</page>, <page text="InteriorHeater">Systems/InteriorHeater</page> |
| <page text="AKSM-101PS">trolleybus_ent_aksm101ps</page> | <page text="RKSU">Systems/RKSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="IR-2002">Systems/IR-2002</page> | <page text="Nameplates">Systems/Nameplates</page> |
| <page text="AKSM-321 / 321N">trolleybus_ent_aksm321</page> | <page text="TRSU">Systems/TRSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="AGIT-132">Systems/Agit-132</page> | — |
| <page text="AKSM-333 / 333O">trolleybus_ent_aksm333</page> | <page text="TRSU">Systems/TRSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="AGIT-132">Systems/Agit-132</page> | — |
| <page text="Trolza-5265">trolleybus_ent_trolza5265</page> | <page text="TRSU">Systems/TRSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="AGIT-132">Systems/Agit-132</page> | <page text="MultiScreen">Systems/MultiScreen</page> |

The ZiU-6205 trailer loads only <page text="AccumulatorBattery">Systems/AccumulatorBattery</page>, <page text="MotorVentilator">Systems/MotorVentilator</page> and <page text="Nameplates">Systems/Nameplates</page>.

## Infrastructure

Each infrastructure entity has its own page with a full method reference:

* <page text="trolleybus_stop">trolleybus_stop</page> — a route stop
* <page text="trolleybus_trafficlight">trolleybus_trafficlight</page> — configurable traffic light
* <page text="trolleybus_traffic_car">trolleybus_traffic_car</page> — AI traffic vehicle
* <page text="trolleybus_polecatcher">trolleybus_polecatcher</page> — pole catcher for automatic wire attachment
* <page text="trolleybus_wheel">trolleybus_wheel</page> — physical wheel created by <page>Trolleybus_System.CreateWheel</page>
* <page text="trolleybus_networkhelper">trolleybus_networkhelper</page> — invisible helper for <page text="helper variables">Trolleybus_System.NetworkSystem.SetHelperVar</page>

## Weapons

* <page text="trolleybus_clicker">trolleybus_clicker</page> — the "clicker": presses cabin buttons from outside and carries the removable reverse handle.`,
});
