// Per-system pages, informators pages and the updated entities/systems guides.
// These are published AFTER pages_rest.mjs, so the guide pages here override
// the earlier versions of Trolleybus_System_Entities / Trolleybus_System_Systems.
import { lib, UNSURE } from "./gen.mjs";

export const systemsPages = [];

const SYS_CAT = "Trolleybus System/Systems";

/** Builds a system page. methods: [name, annotation, unsure?] */
function systemPage(name, buses, desc, methods) {
  const methodList = methods
    .map(([m, a, unsure]) => `* \`${m}\` — ${a}${unsure ? UNSURE : ""}`)
    .join("\n");

  return {
    address: `Systems/${name}`,
    title: name,
    category: SYS_CAT,
    markup: `# ${name}

${desc}

**Used by:** ${buses}

Get the instance from a bus with <page text="Trolleybus:GetSystem">Trolleybus:GetSystem</page>(\`"${name}"\`). Every system also inherits the base methods \`SetNWVar\`/\`GetNWVar\`/\`ClearNWVars\`/\`Unload\` — see the <page text="systems guide">Trolleybus_System_Systems</page>.

## Methods

${methodList}`,
  };
}

const ALL_CLASSIC = "ZiU-682V-013, ZiU-6205, AKSM-101PS, AKSM-321/321N, AKSM-333/333O, Trolza-5265";

systemsPages.push(systemPage("AccumulatorBattery", "all trolleybuses (and the ZiU-6205 trailer)",
  `The 24V accumulator battery: powers the low-voltage circuit when no other low-voltage source is active and recharges from it otherwise. Discharges under load and can run flat.`,
  [
    ["SetActive(active)", "toggles the battery switch"],
    ["IsActive()", "whether the battery is switched on"],
    ["GetChargePercent()", "remaining charge, 0-100"],
    ["SetCharging(charging)", "marks the battery as being recharged"],
    ["GetCharging()", "whether the battery is recharging"],
    ["SetCircuit(circuit) / GetCircuit()", "the low-voltage electric circuit the battery feeds"],
    ["SetCircuitUsageDisabled(disabled)", "temporarily excludes the battery from the circuit", true],
    ["GetLastAmperage() / GetLastVoltage()", "last computed output values"],
    ["GetLowVoltage()", "current low-voltage output"],
  ]));

systemsPages.push(systemPage("Engine", "all trolleybuses",
  `The traction electric motor: converts the amperage supplied by the control system (<page text="RKSU">Systems/RKSU</page>/<page text="TISU">Systems/TISU</page>/<page text="TRSU">Systems/TRSU</page>) into wheel rotation, and works as a generator during electric braking.`,
  [
    ["SetAmperage(amperage)", "sets the incoming amperage that accelerates the rotor"],
    ["GetAmperage()", "current amperage"],
    ["SetAsGenerator(gen)", "switches the motor into generator (electric brake) mode"],
    ["SetBrakeFraction(fr)", "braking force fraction in generator mode"],
    ["SetInverted(inverted)", "inverts the rotation direction (reverse)"],
    ["SetRotation(rotation) / GetRotation()", "rotor rotation speed (networked)"],
    ["GetResistance()", "motor resistance for the electric circuit"],
    ["GetMoveSpeed()", "bus speed derived from the rotation"],
    ["PreDriveWheelsRotationUpdate(...)", "hook into the wheel rotation update"],
  ]));

systemsPages.push(systemPage("Reductor", "all trolleybuses",
  `The rear-axle reducer (gearbox) between the engine and the wheels: transfers rotation both ways and produces the characteristic gear whine depending on the spawn-setting reducer type.`,
  [
    ["SetRotation(rotation) / GetRotation()", "input shaft rotation"],
    ["GetWheelsControl()", "how the rotation maps to the drive wheels", true],
    ["GetLastDifference() / GetLastDifferenceLerped()", "difference between engine and wheels rotation (used for sounds)", true],
    ["PostDriveWheelsRotationUpdate(...)", "hook into the wheel rotation update"],
  ]));

systemsPages.push(systemPage("Pneumatic", "all trolleybuses",
  `The air system: the motor-compressor fills the tanks, air pressure feeds the brakes, the suspension and the doors. Without pressure the bus cannot brake properly and the doors move slowly or not at all.`,
  [
    ["SetMotorCompressorActive(active) / IsMotorCompressorActive()", "toggles the motor-compressor"],
    ["ShouldBeMotorCompressorActive()", "regulator: whether the compressor should run now (pressure below the cut-in threshold)"],
    ["GetAir() / SetAir(air)", "current air amount in the tanks"],
    ["GetBrakePressure()", "pressure available to the brakes"],
    ["SetBrake(fr) / GetBrake()", "brake application fraction"],
    ["GetBrakeControlFraction()", "how far the brake pedal circuit is applied", true],
    ["GetWheelsBrake()", "resulting wheel brake force"],
    ["CanDoorsMove()", "whether there is enough air for the doors"],
    ["ModifyDoorsSpeed(...) / OnDoorMove(...)", "door movement integration"],
  ]));

systemsPages.push(systemPage("Handbrake", "all trolleybuses",
  `The parking (hand) brake: locks the wheels when active; on pneumatic buses interacts with the air system.`,
  [
    ["SetActive(active)", "engages/releases the handbrake"],
    ["GetWheelsBrake()", "brake force applied to the wheels"],
    ["GetAirFromSystem() / UpdatePneumaticAir(...)", "air usage integration", true],
  ]));

systemsPages.push(systemPage("HydraulicBooster", "all trolleybuses",
  `The power steering pump (hydraulic booster): an electric pump that makes the steering wheel light. Without it (or without power) steering becomes slow and heavy.`,
  [
    ["SetAmperage(amperage) / GetAmperage()", "pump motor current"],
    ["GetPowerFraction()", "how much boost the pump currently provides"],
    ["GetSteerBoosterPowerFraction()", "steering assistance fraction used by the steering code"],
  ]));

systemsPages.push(systemPage("StaticVoltageConverter", "AKSM-101PS, AKSM-321/321N, AKSM-333/333O, Trolza-5265",
  `The static voltage converter: converts the 550V line into the 24V low-voltage network on newer buses (replacing the motor-ventilator generator of older models) and recharges the <page text="battery">Systems/AccumulatorBattery</page>.`,
  [
    ["SetActive(active) / IsActive()", "toggles the converter"],
    ["GetVoltage() / GetLowVoltage()", "output voltage"],
    ["SetCircuit(circuit)", "the low-voltage circuit the converter feeds"],
  ]));

systemsPages.push(systemPage("MotorVentilator", "ZiU-682V-013, ZiU-6205 (and its trailer)",
  `The motor-ventilator of older buses: a ventilator unit whose generator feeds the 24V low-voltage network while spinning (the older-generation counterpart of the <page text="static converter">Systems/StaticVoltageConverter</page>).`,
  [
    ["SetActive(active) / IsActive()", "toggles the ventilator"],
    ["GetVoltage() / GetLowVoltage()", "generator output"],
    ["SetCircuit(circuit)", "the low-voltage circuit it feeds"],
  ]));

systemsPages.push(systemPage("RKSU", "ZiU-682V-013, AKSM-101PS",
  `RKSU — the resistor-contactor control system of classic trolleybuses: the pedal drives a group controller that switches resistor stages with loud contactor clicks, controlling engine amperage for acceleration and rheostatic braking.`,
  [
    ["ControlPedals(...)", "translates the pedals into controller positions"],
    ["GetPosition()", "current controller position"],
    ["GetResistance()", "current resistance inserted into the traction circuit"],
    ["SetEngineAmperage(...) / IsEngineAsGenerator()", "engine integration"],
    ["GetEngineBrakeFraction()", "electric brake force"],
    ["SetContactorsActive(active)", "line contactors state"],
    ["PlayContactorSound(...)", "contactor click sounds"],
    ["HUDPaint()", "debug/HUD drawing", true],
  ]));

systemsPages.push(systemPage("TISU", "ZiU-6205",
  `TISU — the thyristor-pulse control system of the ZiU-6205: smooth, stepless engine current control instead of resistor stages.`,
  [
    ["ControlPedals(...)", "translates the pedals into control output"],
    ["GetResistance()", "traction circuit resistance"],
    ["SetEngineAmperage(...) / GetEngineAmperage()", "engine current control"],
    ["SetEngineRotation(...) / GetEngineRotation()", "engine rotation integration"],
    ["IsEngineAsGenerator() / GetEngineBrakeFraction()", "electric braking"],
    ["SetContactorsActive(active) / PlayContactorSound(...)", "line contactors"],
    ["SetTISUBlockActive(active)", "enables/disables the TISU block", true],
  ]));

systemsPages.push(systemPage("TRSU", "AKSM-321/321N, AKSM-333/333O, Trolza-5265",
  `TRSU — the transistor (IGBT) control system of modern buses: silent stepless traction control with regenerative braking.`,
  [
    ["ControlPedals(...)", "translates the pedals into control output"],
    ["GetResistance()", "traction circuit resistance"],
    ["SetEngineAmperage(...) / GetEngineAmperage()", "engine current control"],
    ["IsEngineAsGenerator() / GetEngineBrakeFraction()", "electric braking"],
  ]));

systemsPages.push(systemPage("Heater", "all trolleybuses",
  `The driver cabin heater with a vent fan.`,
  [
    ["SetState(state) / GetState()", "heater mode"],
    ["SetVentActive(active) / IsVentActive()", "vent fan state"],
  ]));

systemsPages.push(systemPage("InteriorHeater", "ZiU-6205",
  `Passenger compartment heaters.`,
  [
    ["SetState(state) / GetState()", "heater mode"],
    ["SetVentActive(active) / IsVentActive()", "vent fan state"],
  ]));

systemsPages.push(systemPage("Horn", "all trolleybuses",
  `The horn: plays the bus-specific horn sound while the horn button (default T) is held.`,
  [
    ["ShouldActive()", "whether the horn should sound right now"],
  ]));

systemsPages.push(systemPage("Buzzer", "all trolleybuses",
  `The cabin buzzer: the signal used by conductors/passengers to signal the driver (and door warning on some buses).`,
  [
    ["SetActive(active) / IsActive()", "buzzer state"],
  ]));

systemsPages.push(systemPage("Nameplates", "ZiU-682V-013, ZiU-6205 (and trailer), AKSM-101PS",
  `Route nameplates of classic buses: paper/board route plates (front, side, rear) with route number and endpoints, switchable with hidden prev/next buttons (built with <page text="BuildNameplatePanel">Trolleybus_System.BuildNameplatePanel</page>).`,
  [
    ["SetRoute(route) / GetRoute()", "current route"],
    ["GetPrevRoute() / GetNextRoute()", "route cycling"],
    ["GetRouteName() / GetRouteStart() / GetRouteEnd()", 'displayed texts (see <page text="Routes">Trolleybus_System.Routes</page>)'],
    ["DrawRoute(...)", "plate drawing"],
  ]));

systemsPages.push(systemPage("MultiScreen", "Trolza-5265",
  `The multimedia passenger screen of the Trolza-5265 Megapolis.`,
  [
    ["EnableScreen() / DisableScreen() / IsScreenDisabled()", "screen power state", true],
    ["LoadScreen(...) / UnloadScreen(...)", "screen content management", true],
  ]));

systemsPages.push(systemPage("Agit-132", "AKSM-321/321N, AKSM-333/333O, Trolza-5265",
  `AGIT-132 — the electronic informator device of modern buses: an LCD unit in the cabin that shows the current route, plays stop announcements from the <page text="informator data">Trolleybus_System_Informators</page> and drives the interior displays. Controlled with its own hotkeys (default -/=).`,
  [
    ["SetActive(active) / IsActive()", "device power"],
    ["SetRoute(route) / GetRoute()", "selected informator route"],
    ["SetRouteState(active) / IsRouteState()", "route selection mode"],
    ["OnChangeButtonPressed(isnext) / OnPlayButtonPressed() / OnEditButtonPressed()", "front-panel buttons"],
    ["PlaySound(...) / StopSound() / IsPlaying()", "announcement playback"],
    ["GetStopText()", "text shown for the current stop", true],
    ["DrawScreen(drawscale, x, y)", "clientside screen rendering"],
  ]));

systemsPages.push(systemPage("IR-2002", "AKSM-101PS, ZiU-6205",
  `IR-2002 — the informator device of older buses: a digit-display unit that shows the route number and plays stop announcements from the <page text="informator data">Trolleybus_System_Informators</page>. Controlled with its own hotkeys (default -/=).`,
  [
    ["SetActive(active) / IsActive()", "device power"],
    ["SetRoute(route) / GetRoute()", "selected informator route"],
    ["SetRouteState(active) / IsRouteState()", "route selection mode"],
    ["OnChangeButtonPressed(isnext)", "front-panel button"],
    ["PlaySound(...) / StopSound()", "announcement playback"],
    ["DrawDigits(...)", "clientside digit rendering"],
  ]));

/* ================= Informators ================= */

systemsPages.push({
  address: "Trolleybus_System_Informators",
  title: "Informators",
  category: "Trolleybus System",
  markup: `# Informators

Informators are the voice/stop-announcement configurations of the addon: per map you can define named announcement sets (routes with their ordered stop announcements and sound files), which the in-bus informator devices play for passengers.

## Data

* The registry is available with <page>Trolleybus_System.GetInformators</page> and lives in \`Trolleybus_System.Informators\`
* It is edited in game with the **Informator Editor** tool (\`trolleyinformatoreditor\`, superadmin by default) and stored per map via <page>Trolleybus_System.WriteDataFile</page>
* Serverside persistence: <page>Trolleybus_System.SaveInformators</page> / <page>Trolleybus_System.LoadInformators</page>

## Devices

The playback devices are trolleybus <page text="systems">Trolleybus_System_Systems</page>:

* <page text="AGIT-132">Systems/Agit-132</page> — LCD informator of the modern buses (AKSM-321/333, Trolza-5265)
* <page text="IR-2002">Systems/IR-2002</page> — digit-display informator of the older buses (AKSM-101PS, ZiU-6205)

The driver selects the informator route on the device and triggers announcements at stops; the sound reaches everyone inside the bus.

## Bus state

Playback state is networked through the base-class DT variables \`InformatorState\`, \`InformatorID\` and \`InformatorPlayLine\` (see the <page text="Trolleybus class">Trolleybus</page>); the serverside playback bookkeeping lives in \`bus.InformatorData\` (playlines, current sound and timing).${UNSURE}`,
});

systemsPages.push(lib("SaveInformators", "Server",
  `Writes the informators registry of the current map to its data file and broadcasts the updated data to all players.`,
  []));

systemsPages.push(lib("LoadInformators", "Server",
  `Loads the informators registry of the current map from its data file, or transmits it to the given player.`,
  [["ply", "Player", "Recipient, or nil to (re)load serverside."],
   ["force", "boolean", "Proceed even when no data file exists.", "false"]]));

/* ================= Updated guide pages ================= */

systemsPages.push({
  address: "Trolleybus_System_Systems",
  title: "Trolleybus systems",
  category: SYS_CAT,
  markup: `# Trolleybus systems

A **system** is a reusable module of trolleybus equipment. Systems live in \`lua/trolleybus_system/systems/<name>\` and register themselves with <page>Trolleybus_System.RegisterSystem</page>:

\`\`\`lua
SYSTEM = {}

function SYSTEM:Initialize()
    self.IncomeAmperage = 0
end

function SYSTEM:Think()
    -- called by the bus
end

Trolleybus_System.RegisterSystem("mysystem", SYSTEM)
\`\`\`

A bus loads systems in its \`LoadSystems\` method using <page>Trolleybus:LoadSystem</page> and talks to them through <page>Trolleybus:GetSystem</page>, <page>Trolleybus:SystemsHook</page> and <page>Trolleybus:SystemsEvent</page>.

## Base methods

Every system instance inherits:

* \`SetNWVar(name, value)\` / \`GetNWVar(name, default)\` — networked variables scoped to the instance (stored as \`sys.<name>:<index>.<var>\` on the bus)
* \`ClearNWVars()\` — removes all variables the instance has set
* \`Unload()\` — called on unload; clears the variables

Instance fields: \`Name\`, \`Index\`, \`Trolleybus\`.

## Bundled systems

Power and drive: <page text="Engine">Systems/Engine</page>, <page text="Reductor">Systems/Reductor</page>, <page text="RKSU">Systems/RKSU</page>, <page text="TISU">Systems/TISU</page>, <page text="TRSU">Systems/TRSU</page>, <page text="AccumulatorBattery">Systems/AccumulatorBattery</page>, <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page>, <page text="MotorVentilator">Systems/MotorVentilator</page>

Chassis and comfort: <page text="Pneumatic">Systems/Pneumatic</page>, <page text="Handbrake">Systems/Handbrake</page>, <page text="HydraulicBooster">Systems/HydraulicBooster</page>, <page text="Heater">Systems/Heater</page>, <page text="InteriorHeater">Systems/InteriorHeater</page>

Signals and info: <page text="Horn">Systems/Horn</page>, <page text="Buzzer">Systems/Buzzer</page>, <page text="Nameplates">Systems/Nameplates</page>, <page text="MultiScreen">Systems/MultiScreen</page>, <page text="AGIT-132">Systems/Agit-132</page>, <page text="IR-2002">Systems/IR-2002</page>

See also: <page text="Informators">Trolleybus_System_Informators</page>.`,
});

systemsPages.push({
  address: "Trolleybus_System_Entities",
  title: "Trolleybus entities",
  category: "Trolleybus System",
  markup: `# Entity classes

## Drivable trolleybuses

All inherit from \`trolleybus_ent_base\` (see the <page text="Trolleybus class">Trolleybus</page>). Trailer sections inherit from \`trolleybus_ent_base_trailer\`.

| Class | Vehicle |
|-------|---------|
| \`trolleybus_ent_ziu682v013\` | ZiU-682V-013 |
| \`trolleybus_ent_ziu6205\` (+ \`_trailer\`) | ZiU-6205 |
| \`trolleybus_ent_aksm101ps\` | AKSM-101PS |
| \`trolleybus_ent_aksm321\` / \`aksm321n\` | AKSM-321 |
| \`trolleybus_ent_aksm333\` (+ \`_trailer\`) | AKSM-333 |
| \`trolleybus_ent_aksm333o\` / \`aksm333o_msk\` (+ \`_trailer\`) | AKSM-333O |
| \`trolleybus_ent_trolza5265\` | Trolza-5265 "Megapolis" |

## Systems per trolleybus

Every bus loads <page text="AccumulatorBattery">Systems/AccumulatorBattery</page>, <page text="Engine">Systems/Engine</page>, <page text="Reductor">Systems/Reductor</page>, <page text="Pneumatic">Systems/Pneumatic</page>, <page text="Handbrake">Systems/Handbrake</page>, <page text="HydraulicBooster">Systems/HydraulicBooster</page>, <page text="Heater">Systems/Heater</page>, <page text="Horn">Systems/Horn</page> and <page text="Buzzer">Systems/Buzzer</page>. On top of that:

| Trolleybus | Control system | Low voltage | Informator | Other |
|------------|----------------|-------------|------------|-------|
| ZiU-682V-013 | <page text="RKSU">Systems/RKSU</page> | <page text="MotorVentilator">Systems/MotorVentilator</page> | — | <page text="Nameplates">Systems/Nameplates</page> |
| ZiU-6205 | <page text="TISU">Systems/TISU</page> | <page text="MotorVentilator">Systems/MotorVentilator</page> | <page text="IR-2002">Systems/IR-2002</page> | <page text="Nameplates">Systems/Nameplates</page>, <page text="InteriorHeater">Systems/InteriorHeater</page> |
| AKSM-101PS | <page text="RKSU">Systems/RKSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="IR-2002">Systems/IR-2002</page> | <page text="Nameplates">Systems/Nameplates</page> |
| AKSM-321 / 321N | <page text="TRSU">Systems/TRSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="AGIT-132">Systems/Agit-132</page> | — |
| AKSM-333 / 333O | <page text="TRSU">Systems/TRSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="AGIT-132">Systems/Agit-132</page> | — |
| Trolza-5265 | <page text="TRSU">Systems/TRSU</page> | <page text="StaticVoltageConverter">Systems/StaticVoltageConverter</page> | <page text="AGIT-132">Systems/Agit-132</page> | <page text="MultiScreen">Systems/MultiScreen</page> |

The ZiU-6205 trailer loads only <page text="AccumulatorBattery">Systems/AccumulatorBattery</page>, <page text="MotorVentilator">Systems/MotorVentilator</page> and <page text="Nameplates">Systems/Nameplates</page>.

## Infrastructure

* \`trolleybus_stop\` — a route stop (spawned automatically from route data; fires the <page text="Stop_TrolleybusArrived">TrolleybusSystem_Stop_TrolleybusArrived</page>/<page text="Stop_TrolleybusLeft">TrolleybusSystem_Stop_TrolleybusLeft</page> events)
* \`trolleybus_trafficlight\` — configurable traffic light
* \`trolleybus_traffic_car\` — AI traffic vehicle
* \`trolleybus_polecatcher\` — pole catcher for automatic wire attachment
* \`trolleybus_wheel\` — physical wheel created by <page>Trolleybus_System.CreateWheel</page>
* \`trolleybus_networkhelper\` — invisible helper entity for <page text="helper variables">Trolleybus_System.NetworkSystem.SetHelperVar</page>

## Weapons

* \`trolleybus_clicker\` — the "clicker": lets players press cabin buttons from outside the driver seat and carries the removable reverse handle between buses.`,
});
