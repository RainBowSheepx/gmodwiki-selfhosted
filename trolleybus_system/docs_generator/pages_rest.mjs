// Namespaces, Trolleybus class, hooks and overview pages.
import { lib, method, hookPage, UNSURE } from "./gen.mjs";

export const restPages = [];

/* ================= ContactNetwork ================= */

const CN = { parent: "Trolleybus_System.ContactNetwork", category: "Trolleybus System/Trolleybus_System.ContactNetwork" };

restPages.push({
  address: "Trolleybus_System.ContactNetwork",
  title: "Trolleybus_System.ContactNetwork",
  category: CN.category,
  markup: `The contact network library manages the overhead wire system trolleybuses take power from: contact wires, suspensions, pillars, crossings and voltage sources. Objects are placed with the \`trolleybus_cn_editor\` tool and stored per map (see <page>Trolleybus_System.WriteDataFile</page>).

Objects come in two classes:

* **Contacts** (class 0) — wire objects the trolley poles slide along
* **SuspensionAndOther** (class 1) — suspensions, pillars and decorative objects

The current network voltage is available with <page>Trolleybus_System.ContactNetwork.GetVoltage</page>; per-wire voltage with <page>Trolleybus_System.ContactNetwork.GetContactWireVoltage</page>.

<methods/>`,
});

restPages.push(lib("CreateContact", "Shared",
  `Creates a contact (wire) object of the given registered type without adding it to the object registry.`,
  [["type", "string", "Contact type name from \`ContactNetwork.Types.Contacts\`."],
   ["pos", "Vector", "Position."],
   ["ang", "Angle", "Angles."]],
  [["table", "The contact object, or nil for an unknown type."]], CN));

restPages.push(lib("CreateSuspensionAndOther", "Shared",
  `Creates a suspension/pillar/decoration object of the given registered type without adding it to the registry.`,
  [["type", "string", "Type name from \`ContactNetwork.Types.SuspensionAndOther\`."],
   ["pos", "Vector", "Position."],
   ["ang", "Angle", "Angles."]],
  [["table", "The object, or nil for an unknown type."]], CN));

restPages.push(lib("CreateFromTransmitData", "Shared",
  `Recreates a contact network object from its serialized transmit data (as produced by an object's \`GetTransmitData\` and sent to clients / stored in data files).`,
  [["data", "table", "Serialized object data (\`Class\`, \`Type\`, positions, properties, connections)."]],
  [["table", "The recreated object, or nil."]], CN));

restPages.push(lib("AddObject", "Shared",
  `Creates an object from transmit data and registers it under the given name, replacing any existing object with that name.`,
  [["name", "string", "Registry name."],
   ["data", "table", "Serialized object data."]], [], CN));

restPages.push(lib("NewObject", "Shared",
  `Creates a new object of the given class/type and registers it under an automatically generated unique name.`,
  [["class", "number", "0 for contacts, 1 for suspensions/other."],
   ["type", "string", "Registered type name."],
   ["pos", "Vector", "Position."],
   ["ang", "Angle", "Angles."]],
  [["string", "The generated object name."],
   ["table", "The created object."]], CN));

restPages.push(lib("RemoveObject", "Shared",
  `Removes the registered object with the given name and calls its \`Remove\` method.`,
  [["name", "string", "Registry name."]], [], CN));

restPages.push(lib("GetObject", "Shared",
  `Returns the registered contact network object with the given name.`,
  [["name", "string", "Registry name."]],
  [["table", "The object, or nil."]], CN));

restPages.push(lib("GetObjectData", "Shared",
  `Returns the serialized transmit data of a registered object including its connections — the same format accepted by <page>Trolleybus_System.ContactNetwork.AddObject</page>.`,
  [["name", "string", "Registry name."]],
  [["table", "Serialized object data."]], CN));

restPages.push(lib("GetObjectName", "Shared",
  `Returns the registry name of a contact network object (reverse lookup).`,
  [["object", "table", "The object."]],
  [["string", "The name, or nil when not registered."]], CN));

restPages.push(lib("ApplyObjectChanges", "Shared",
  `Applies edited properties, position/angles and connections to a registered object (used by the contact network editor when saving changes).`,
  [["name", "string", "Registry name."],
   ["data", "table", "New properties/position/connections."]], [], CN));

restPages.push(lib("ClearObjects", "Shared",
  `Removes every registered contact network object.`, [], [], CN));

restPages.push(lib("GetCurrentContactWire", "Shared",
  `Calculates where a trolley pole head currently touches the given contact object, returning wire attachment data used to keep the pole on the wire.`,
  [["polepos", "Vector", "Pole base position."],
   ["polelen", "number", "Pole length."],
   ["contact", "any", "Contact object or its registry name."],
   ["wire", "number", "Wire index within the contact."],
   ["endpos", "Vector", "Current pole end position."]],
  [["Vector", "Contact position on the wire, or nil."],
   ["Angle", "Wire direction at that point."],
   ["number", "Fraction along the wire."]], CN));

restPages.push(lib("GetNearestContactWire", "Shared",
  `Finds the nearest main contact wire a pole head could attach to within 15 units of the wheel position.`,
  [["polepos", "Vector", "Pole base position."],
   ["polelen", "number", "Pole length."],
   ["wheelpos", "Vector", "Pole head (wheel) position."]],
  [["table", "Contact object, or nil."],
   ["number", "Wire index."],
   ["Vector", "Attachment position."],
   ["Angle", "Wire direction."]], CN));

restPages.push(lib("GetContactWireVoltage", "Shared",
  `Returns the voltage of a specific wire of a contact object, and whether that wire is on the positive line.`,
  [["contact", "string", "Contact object registry name."],
   ["wire", "number", "Wire index."]],
  [["number", "Voltage."],
   ["boolean", "True for the positive wire."]], CN));

restPages.push(lib("GetVoltage", "Shared",
  `Returns the global contact network voltage (the \`trolleybus_contact_network_voltage\` admin setting, networked through the world entity).`,
  [], [["number", "Voltage in volts."]], CN));

restPages.push(lib("Load", "Server",
  `Loads the contact network of the current map from its data file and creates all objects. With a player given, transmits the network to that player instead.`,
  [["ply", "Player", "Recipient, or nil to (re)load serverside."]], [], CN));

restPages.push(lib("Save", "Server",
  `Serializes all contact network objects and writes them to the map's data file.`, [], [], CN));

restPages.push(lib("UpdateWiresVoltageLinks", "Server",
  `Rebuilds which wires are powered from which voltage sources after the network changes.${UNSURE}`, [], [], CN));

/* ================= Routes ================= */

const RT = { parent: "Trolleybus_System.Routes", category: "Trolleybus System/Trolleybus_System.Routes" };

restPages.push({
  address: "Trolleybus_System.Routes",
  title: "Trolleybus_System.Routes",
  category: RT.category,
  markup: `Route and stop management. Routes are edited with the \`trolleybus_routes_editor\` tool, stored per map and transferred to clients with <page>Trolleybus_System.SendMassiveData</page>.

* \`Trolleybus_System.Routes.Routes\` — table of routes (directions, stop sequences, custom names)
* \`Trolleybus_System.Routes.Stops\` — table of stops; serverside each stop spawns a \`trolleybus_stop\` entity

Route names shown on nameplates come from <page>Trolleybus_System.Routes.GetRouteName</page>, <page>Trolleybus_System.Routes.GetRouteStart</page> and <page>Trolleybus_System.Routes.GetRouteEnd</page>.

<methods/>`,
});

restPages.push(lib("GetRouteName", "Client",
  `Returns the displayed name of a route (localized custom name when set, otherwise the route number itself).`,
  [["route", "any", "Route key from \`Trolleybus_System.Routes.Routes\`."]],
  [["string", "Route display name, or nil for unknown routes."]], RT));

restPages.push(lib("GetRouteStart", "Client",
  `Returns the displayed name of the route's first stop (or its localized custom start name).`,
  [["route", "any", "Route key."]],
  [["string", "Start name, or nil for unknown routes."]], RT));

restPages.push(lib("GetRouteEnd", "Client",
  `Returns the displayed name of the route's final stop, the localized custom end name, or the "circular route" phrase for circular routes.`,
  [["route", "any", "Route key."]],
  [["string", "End name, or nil for unknown routes."]], RT));

restPages.push(lib("Load", "Server",
  `Loads routes and stops of the current map from the data file (spawning stop entities), or transmits them to the given player.`,
  [["ply", "Player", "Recipient, or nil to (re)load serverside."]], [], RT));

restPages.push(lib("Save", "Server",
  `Writes the current routes and stops to the map's data file.`, [], [], RT));

restPages.push(lib("UpdateStops", "Server",
  `Synchronizes \`trolleybus_stop\` entities with the stops table: removes entities for deleted stops and spawns entities for new ones.`,
  [], [], RT));

/* ================= NetworkSystem ================= */

const NS = { parent: "Trolleybus_System.NetworkSystem", category: "Trolleybus System/Trolleybus_System.NetworkSystem" };

restPages.push({
  address: "Trolleybus_System.NetworkSystem",
  title: "Trolleybus_System.NetworkSystem",
  category: NS.category,
  markup: `A lightweight networked-variables system used instead of the engine NW vars: values (string, number, bool, Vector, Angle, nil) are attached to entities by string name and efficiently synced to clients, including full state for newly connected players.

Trolleybuses wrap it with <page>Trolleybus:SetNWVar</page> / <page>Trolleybus:GetNWVar</page>; "helper" variables live on invisible \`trolleybus_networkhelper\` entities addressed by a string index.

<methods/>`,
});

restPages.push(lib("SetNWVar", "Server",
  `Sets a networked variable on an entity (world entity allowed) and syncs it to clients. Setting nil removes the variable.

<note>A clientside version exists as well, but it only changes the local value — it is not sent to the server.</note>`,
  [["ent", "Entity", "Target entity."],
   ["var", "string", "Variable name."],
   ["value", "any", "string/number/bool/Vector/Angle or nil."]], [], NS));

restPages.push(lib("GetNWVar", "Shared",
  `Returns a networked variable of an entity, or the default when not set. Values are copied, so modifying a returned Vector/Angle does not affect the stored value.`,
  [["ent", "Entity", "Target entity."],
   ["var", "string", "Variable name."],
   ["default", "any", "Fallback value."]],
  [["any", "The stored value or the default."]], NS));

restPages.push(lib("SetHelperVar", "Server",
  `Sets a networked variable on a named global helper entity (created on demand). Useful for global state not tied to a specific entity.`,
  [["index", "string", "Helper name."],
   ["var", "string", "Variable name."],
   ["value", "any", "Value or nil."]], [], NS));

restPages.push(lib("GetHelperVar", "Shared",
  `Returns a variable of a named global helper entity, or the default when the helper or variable does not exist.`,
  [["index", "string", "Helper name."],
   ["var", "string", "Variable name."],
   ["default", "any", "Fallback value."]],
  [["any", "The stored value or the default."]], NS));

/* ================= DeviceInputModule ================= */

const DIM = { parent: "Trolleybus_System.DeviceInputModule", category: "Trolleybus System/Trolleybus_System.DeviceInputModule" };

restPages.push({
  address: "Trolleybus_System.DeviceInputModule",
  title: "Trolleybus_System.DeviceInputModule",
  category: DIM.category,
  markup: `Support for external input devices (steering wheels, joysticks, button boxes) through the binary \`joystick\` module (\`lua/bin\`). When the module is available, external steer/pedals/buttons can drive a trolleybus (see the \`UseExternalSteer\`/\`UseExternalPedals\`/\`UseExternalButtons\` settings and \`Trolleybus_System.ExternalButtons\` flags).

<methods/>`,
});

restPages.push(lib("LoadModule", "Client",
  `Attempts to load the binary joystick module and initialize device input.`,
  [], [["boolean", "True on success."]], DIM));

restPages.push(lib("HasModule", "Client",
  `Returns whether the joystick binary module is installed (present in \`lua/bin\`).${UNSURE}`,
  [], [["boolean", "Module availability."]], DIM));

restPages.push(lib("ModuleLoaded", "Client",
  `Returns whether the joystick module has been loaded and initialized.${UNSURE}`,
  [], [["boolean", "Module state."]], DIM));

restPages.push(lib("GetDevices", "Client",
  `Returns the list of detected input devices.${UNSURE}`,
  [], [["table", "Detected devices."]], DIM));

restPages.push(lib("GetDeviceByGUID", "Client",
  `Returns a detected input device by its GUID string.${UNSURE}`,
  [["guid", "string", "Device GUID."]],
  [["table", "The device, or nil."]], DIM));

restPages.push(lib("UpdateDevices", "Client",
  `Re-enumerates connected input devices.${UNSURE}`, [], [], DIM));

restPages.push(lib("IsExternalButtonDown", "Server",
  `Returns whether an external controller button (a \`Trolleybus_System.ExternalButtons\` flag networked from the client's device) is held by the player.${UNSURE}`,
  [["ply", "Player", "The player."],
   ["button", "number", "ExternalButtons flag."]],
  [["boolean", "True while held."]],
  { parent: "Trolleybus_System", category: "Trolleybus System/Trolleybus_System" }));

/* ================= Trolleybus class ================= */

restPages.push({
  address: "Trolleybus",
  title: "Trolleybus",
  category: "Trolleybus System/Trolleybus",
  markup: `The base trolleybus class (\`trolleybus_ent_base\`). Every drivable trolleybus (ZiU-682V, AKSM-321, Trolza-5265 "Megapolis", ...) inherits from it; a bus consists of the body entity, wheel entities, seat vehicles, trolley poles and a set of <page text="systems">Trolleybus_System_Systems</page> (engine, pneumatics, control units...).

Entities with \`ENT.IsTrolleybus = true\` are recognized by the addon; trailers additionally set \`ENT.IsTrailer\` and link to their tractor via \`GetTrolleybus\`.

# Networked DT variables

The base class defines many DT variables with the usual Get/Set accessors, including: \`SteerAngle\`, \`MoveSpeed\`, \`StartPedal\`, \`BrakePedal\`, \`PowerFromCN\`, \`HandbrakeActive\`, \`EmergencySignal\`, \`TurnSignal\`, \`RouteNum\`, \`BortNumber\`, \`ReverseState\`, \`DriverSeat\`, \`Driver\`, \`Trailer\`, \`Trolleybus\`, \`PoleState/PoleContact/PoleMoveAng (Left/Right)\`, light levels (\`HeadLights\`, \`CabineLight\`, \`InteriorLight\`, \`ScheduleLight\`...), \`PassCount\`, \`InformatorState/ID/PlayLine\`.

Changing a DT variable fires the <page>TrolleybusSystem_Trolleybus_DTVarChanged</page> event.

<methods/>`,
});

restPages.push(method("DoorIsOpened", "Shared",
  `Returns whether the named door is open. Clientside, \`fullyclosed\` also reports true while the door is still animating shut.`,
  [["name", "string", "Door name."],
   ["fullyclosed", "boolean", "(Clientside) treat a not-fully-closed door as open."]],
  [["boolean", "Door state."]]));

restPages.push(method("GetHighVoltage", "Shared",
  `Returns the high voltage currently available to the bus from the contact network (through its own poles, or through the linked tractor/trailer when this section has no poles).`,
  [], [["number", "Voltage."]]));

restPages.push(method("ButtonIsDown", "Shared",
  `Returns whether the named cabin button is currently pressed.`,
  [["name", "string", "Button name."]],
  [["boolean", "Pressed state."]]));

restPages.push(method("GetMultiButton", "Shared",
  `Returns the integer state of a multi-position switch built with <page>Trolleybus_System.BuildMultiButton</page>.`,
  [["btn", "string", "Switch index."]],
  [["number", "Current state (0 by default)."]]));

restPages.push(method("GetReverseButton", "Shared",
  `Returns the state of a reverse switch built with <page>Trolleybus_System.BuildReverseButton</page>.`,
  [["btn", "string", "Switch index."]],
  [["number", "Position: -1 backward, 0 neutral, 1 forward."],
   ["boolean", "True when the removable handle is inserted."]]));

restPages.push(method("IsButtonDisabled", "Shared",
  `Returns whether the cabin button was disabled with <page>Trolleybus:SetButtonDisabled</page>.`,
  [["btn", "string", "Button name."]],
  [["boolean", "Disabled state."]]));

restPages.push(method("UPSToKPH", "Shared",
  `Converts a speed from source units per second to kilometers per hour (using \`Trolleybus_System.UnitsPerMeter\` = 37.777).`,
  [["ups", "number", "Speed in units/second."]],
  [["number", "Speed in km/h."]]));

restPages.push(method("KPHToUPS", "Shared",
  `Converts a speed from kilometers per hour to source units per second.`,
  [["kph", "number", "Speed in km/h."]],
  [["number", "Speed in units/second."]]));

restPages.push(method("LoadSystem", "Shared",
  `Loads a registered system onto this bus — shorthand for <page>Trolleybus_System.LoadSystem</page>. Called from the class's \`LoadSystems\` during \`SetupSystems\`.`,
  [["name", "string", "System name."],
   ["defvalues", "table", "Field overrides for the instance."],
   ["index", "string", "Instance index.", "\"0\""]],
  [["table", "The system instance."]]));

restPages.push(method("UnloadSystem", "Shared",
  `Unloads a system instance from this bus — shorthand for <page>Trolleybus_System.UnloadSystem</page>.`,
  [["name", "string", "System name."],
   ["index", "string", "Instance index.", "\"0\""]]));

restPages.push(method("GetSystem", "Shared",
  `Returns a loaded system instance of this bus.`,
  [["name", "string", "System name."],
   ["index", "string", "Instance index.", "\"0\""]],
  [["table", "The system instance, or nil."]]));

restPages.push(method("SetNWVar", "Shared",
  `Sets an addon networked variable on this bus (see <page>Trolleybus_System.NetworkSystem.SetNWVar</page>). Only meaningful serverside; buttons, doors and system states are stored this way.`,
  [["var", "string", "Variable name."],
   ["value", "any", "Value or nil."]]));

restPages.push(method("GetNWVar", "Shared",
  `Returns an addon networked variable of this bus (see <page>Trolleybus_System.NetworkSystem.GetNWVar</page>).`,
  [["var", "string", "Variable name."],
   ["default", "any", "Fallback value."]],
  [["any", "The value or the default."]]));

restPages.push(method("GetMainTrolleybus", "Shared",
  `For trailers returns the tractor; for tractors returns the bus itself.`,
  [["orself", "boolean", "Return self when the tractor is invalid instead of NULL."]],
  [["Entity", "The main trolleybus."]]));

restPages.push(method("GetSpawnSetting", "Shared",
  `Returns the value of a spawn setting the bus was created with (reductor type, doors configuration, skin choices...). Accepts the numeric index or the setting alias.`,
  [["index", "any", "Setting index or alias string."]],
  [["any", "The setting value."]]));

restPages.push(method("SetPoleState", "Shared",
  `Sets the state of a trolley pole and fires the <page>TrolleybusSystem_Trolleybus_PoleStateChanged</page> event. State 0 = on wires / idle, other values describe detaching/lowered phases.`,
  [["state", "number", "New pole state."],
   ["right", "boolean", "True for the right pole."]]));

restPages.push(method("GetPoleState", "Shared",
  `Returns the state of a trolley pole.`,
  [["right", "boolean", "True for the right pole."]],
  [["number", "Pole state."]]));

restPages.push(method("SetPoleContactWire", "Shared",
  `Attaches a pole to a specific contact object and wire, firing the pole contact change events.`,
  [["contact", "string", "Contact object registry name."],
   ["wire", "number", "Wire index."],
   ["right", "boolean", "True for the right pole."]]));

restPages.push(method("GetPoleContactWire", "Shared",
  `Returns the contact object name and wire index a pole is attached to.`,
  [["right", "boolean", "True for the right pole."]],
  [["string", "Contact registry name."],
   ["number", "Wire index."]]));

restPages.push(method("IsPoleLinePositive", "Shared",
  `Returns whether the wire the pole touches is the positive line of the contact network.`,
  [["right", "boolean", "True for the right pole."]],
  [["boolean", "True for the positive wire."]]));

restPages.push(method("PlayerIsInside", "Shared",
  `Returns whether the player's eyes are inside the bus model bounds.`,
  [["ply", "Player", "The player."]],
  [["boolean", "True when inside."]]));

restPages.push(method("GetPolePos", "Shared",
  `Returns the base attachment position of a trolley pole.`,
  [["right", "boolean", "True for the right pole."],
   ["loc", "boolean", "Return the local position instead of world."]],
  [["Vector", "Pole base position."]]));

restPages.push(method("SystemsHook", "Shared",
  `Calls the named method on every loaded system of the bus (and of the linked tractor for trailers) until one returns a value, which is then returned. Used to let systems override behaviour (e.g. pedals, doors).`,
  [["name", "string", "Method name to call."],
   ["arguments", "vararg", "Arguments for the method."]],
  [["any", "First non-nil result."]]));

restPages.push(method("SystemsEvent", "Shared",
  `Calls the named method on every loaded system of the bus, ignoring return values.`,
  [["main", "boolean", "Dispatch on the main (tractor) bus instead of this section."],
   ["name", "string", "Method name."],
   ["arguments", "vararg", "Arguments."]]));

/* --- server methods --- */

restPages.push(method("SetTurn", "Server",
  `Sets the current steering angle of the bus (turn of the front wheels).`,
  [["ang", "number", "Steering angle."]]));

restPages.push(method("OpenDoor", "Server",
  `Opens the named door (unless the doors logic blocks it; \`force\` bypasses the checks).`,
  [["name", "string", "Door name."],
   ["force", "boolean", "Ignore the CanDoorsMove checks.", "false"]]));

restPages.push(method("CloseDoor", "Server",
  `Closes the named door (unless blocked; \`force\` bypasses the checks).`,
  [["name", "string", "Door name."],
   ["force", "boolean", "Ignore the CanDoorsMove checks.", "false"]]));

restPages.push(method("OpenDoorWithHand", "Server",
  `Opens the door the way a person would (used for manual door opening, e.g. depowered bus).${UNSURE}`,
  [["name", "string", "Door name."]]));

restPages.push(method("CloseDoorWithHand", "Server",
  `Closes the door manually, like a person pushing it shut.${UNSURE}`,
  [["name", "string", "Door name."]]));

restPages.push(method("ToggleHandbrake", "Server",
  `Toggles the parking (hand) brake of the bus.`));

restPages.push(method("ChangeReverse", "Server",
  `Requests a reverse (direction) change to the given state. Returns whether the change was accepted (systems may block it, e.g. while moving).`,
  [["state", "number", "-1 backward, 0 neutral, 1 forward."]],
  [["boolean", "True when the state was changed."]]));

restPages.push(method("CanButtonBePressedBy", "Server",
  `Returns whether the player is allowed to press the given cabin button (driver seat, clicker distance and button-specific checks).`,
  [["ply", "Player", "The player."],
   ["btn", "string", "Button name."]],
  [["boolean", "True when allowed."]]));

restPages.push(method("TryPressButtonBy", "Server",
  `Attempts to press/release a cabin button on behalf of the player, running the permission checks first.${UNSURE}`,
  [["ply", "Player", "The player."],
   ["btn", "string", "Button name."],
   ["type", "number", "Press type (press/release/hold)."]]));

restPages.push(method("ToggleButton", "Server",
  `Sets or toggles the pressed state of a cabin button, running its handlers.`,
  [["btn", "string", "Button name."],
   ["value", "boolean", "Explicit state; nil toggles."]]));

restPages.push(method("SetMultiButton", "Server",
  `Sets the integer state of a multi-position switch (networked in \`MultiBtns.&lt;index&gt;\`).`,
  [["btn", "string", "Switch index."],
   ["value", "number", "New state."]]));

restPages.push(method("SetButtonDisabled", "Server",
  `Disables or enables a cabin button (disabled buttons cannot be pressed and can be rendered accordingly).`,
  [["btn", "string", "Button name."],
   ["disabled", "boolean", "Disabled state."]]));

restPages.push(method("AddDynamicButton", "Shared",
  `Adds a cabin button to a spawned bus at runtime (as opposed to buttons declared in \`ENT.ButtonsData\` at class setup). The data table matches the ButtonsData format: \`name\`, \`panel\`, \`func\`/\`onpressby\`, \`hotkey\`...`,
  [["button", "string", "Unique button index."],
   ["data", "table", "Button definition."]]));

restPages.push(method("RemoveDynamicButton", "Shared",
  `Removes a dynamic cabin button added with <page>Trolleybus:AddDynamicButton</page>.`,
  [["button", "string", "Button index."]]));

restPages.push(method("AddDynamicPanel", "Shared",
  `Adds an interactive cabin panel (a plane players can aim at, holding buttons/displays) to a spawned bus at runtime.`,
  [["panel", "string", "Unique panel index."],
   ["data", "table", "Panel definition: \`pos\`, \`ang\`, \`size\`."]]));

restPages.push(method("RemoveDynamicPanel", "Shared",
  `Removes a dynamic panel added with <page>Trolleybus:AddDynamicPanel</page>.`,
  [["panel", "string", "Panel index."]]));

restPages.push(method("AddDynamicOtherPanelEnt", "Shared",
  `Adds a decorative/indicator clientside model bound to a panel (gauge needles, switch knobs...) to a spawned bus at runtime. The data format matches \`ENT.OtherPanelEntsData\`: \`model\`, \`panel\`, \`initialize\`, \`think\`, offsets.`,
  [["ent", "string", "Unique element index."],
   ["data", "table", "Element definition."]]));

restPages.push(method("RemoveDynamicOtherPanelEnt", "Shared",
  `Removes an element added with <page>Trolleybus:AddDynamicOtherPanelEnt</page>.`,
  [["ent", "string", "Element index."]]));

/* ================= Hooks ================= */

restPages.push({
  address: "Trolleybus_System_Hooks",
  title: "Hooks overview",
  category: "Trolleybus System/Hooks",
  markup: `# Trolleybus System hooks

The addon fires its events through <page>Trolleybus_System.RunEvent</page>: an event named \`X\` becomes a global hook \`TrolleybusSystem_X\`, so you subscribe with the standard hook library:

\`\`\`lua
hook.Add("TrolleybusSystem_Trolleybus_PoleStateChanged", "MyAddon", function(value, bus, right)
    print("Pole state changed", bus, right, value)
end)
\`\`\`

Change events built with <page>Trolleybus_System.RunChangeEvent</page> get a \`Changed\` suffix, receive the **new** value first and only fire when the value actually changed: <page text="Trolleybus_DTVarChanged">TrolleybusSystem_Trolleybus_DTVarChanged</page>, <page text="Trolleybus_PoleStateChanged">TrolleybusSystem_Trolleybus_PoleStateChanged</page>, <page text="Trolleybus_PoleContactChanged">TrolleybusSystem_Trolleybus_PoleContactChanged</page>, <page text="Trolleybus_PoleContactWireChanged">TrolleybusSystem_Trolleybus_PoleContactWireChanged</page>, <page text="Trolleybus_ButtonChanged">TrolleybusSystem_Trolleybus_ButtonChanged</page>, <page text="Trolleybus_MultiButtonChanged">TrolleybusSystem_Trolleybus_MultiButtonChanged</page>, <page text="Trolleybus_DoorStateChanged">TrolleybusSystem_Trolleybus_DoorStateChanged</page>, <page text="Trolleybus_ReverseChanged">TrolleybusSystem_Trolleybus_ReverseChanged</page>, <page text="Trolleybus_RenderClientEntsChanged">TrolleybusSystem_Trolleybus_RenderClientEntsChanged</page>, <page text="TrafficLight_StateChanged">TrolleybusSystem_TrafficLight_StateChanged</page>, <page text="ContactNetwork_LoadedStateChanged">TrolleybusSystem_ContactNetwork_LoadedStateChanged</page>.

There is also one plainly named hook: <page>Trolleybus_System.PostInit</page>, fired once after the addon finishes loading.

<methods/>`,
});

restPages.push(hookPage("AllowEditingDefaultMaps", "Shared",
  `Return true to allow the editor tools to modify the data of bundled default maps. Default behaviour: allowed only in singleplayer.`,
  [], [["boolean", "Allow editing."]]));

restPages.push(hookPage("HasAccessToTool", "Shared",
  `Decides whether a player may use one of the addon's editor tools. Default: superadmins only.`,
  [["ply", "Player", "The player."],
   ["tool", "string", "Tool class name."]],
  [["boolean", "Allow usage."]]));

restPages.push(hookPage("HasAccessToAdminSettings", "Server",
  `Decides whether a player may read and change the admin settings menu. Default: superadmins only.`,
  [["ply", "Player", "The player."]],
  [["boolean", "Allow access."]]));

restPages.push(hookPage("OnAdminSettingChange", "Server",
  `Called after an admin setting convar was changed through the settings menu.`,
  [["name", "string", "Setting/convar name."],
   ["ply", "Player", "Who changed it."],
   ["value", "any", "The new value."]]));

restPages.push(hookPage("RegisterTrafficVehicles", "Shared",
  `Called on Initialize to let addons register AI traffic vehicle types and wheel types.`,
  [["types", "table", "Traffic vehicle types registry to fill."],
   ["wheeltypes", "table", "Wheel types registry to fill."]]));

restPages.push(hookPage("RegisterTrafficLightTypes", "Shared",
  `Called on Initialize to let addons register traffic light types and lenses.`,
  [["types", "table", "Traffic light types registry to fill."],
   ["addlense", "function", "<page>Trolleybus_System.AddTrafficLightLense</page> shortcut."]]));

restPages.push(hookPage("AddTrolleybusSkins", "Shared",
  `Called when skins are being registered, so addons can add custom liveries.`,
  [["addskin", "function", "<page>Trolleybus_System.AddTrolleybusSkin</page> shortcut."]]));

restPages.push(hookPage("EyeDataUpdate", "Client",
  `Called every rendered scene with the freshly cached camera data (see <page>Trolleybus_System.EyePos</page>).`,
  [["pos", "Vector", "Camera position."],
   ["ang", "Angle", "Camera angles."],
   ["dir", "Vector", "Camera forward vector."],
   ["fov", "number", "Field of view."]]));

restPages.push(hookPage("ContactNetwork_AllowToggleVoltageSources", "Shared",
  `Decides whether a player may toggle contact network voltage sources. Default: admins.`,
  [["ply", "Player", "The player."]],
  [["boolean", "Allow toggling."]]));

restPages.push(hookPage("ContactNetwork_ShouldPillarLampEmitLight", "Shared",
  `Decides whether contact network pillar lamps should emit dynamic light.${UNSURE}`,
  [], [["boolean", "Emit light."]]));

restPages.push(hookPage("ContactNetwork_OnUpdate", "Client",
  `Called clientside when the loaded contact network objects change (created/removed/edited or received from the server).`,
  []));

restPages.push(hookPage("ContactNetwork_OnUpdateWiresVoltageLinks", "Server",
  `Called after wire-to-voltage-source links were rebuilt.${UNSURE}`,
  []));

restPages.push(hookPage("Stop_TrolleybusArrived", "Server",
  `Called when a trolleybus arrives at a stop (used e.g. for passenger exchange).${UNSURE}`,
  [["stop", "Entity", "The trolleybus_stop entity."],
   ["bus", "Entity", "The trolleybus."],
   ["route", "any", "The route the bus serves this stop with."]]));

restPages.push(hookPage("Stop_TrolleybusLeft", "Server",
  `Called when a trolleybus leaves a stop.${UNSURE}`,
  [["stop", "Entity", "The trolleybus_stop entity."],
   ["bus", "Entity", "The trolleybus."],
   ["route", "any", "The route the bus serves this stop with."]]));

restPages.push(hookPage("Trolleybus_OnElectricArc", "Server",
  `Called when an electric arc happens between a trolley pole and the wire (poles bouncing, crossing sections...).${UNSURE}`,
  [["bus", "Entity", "The trolleybus."]]));

restPages.push(hookPage("Trolleybus_PreventRenderClientEnts", "Client",
  `Return true to prevent a trolleybus from creating/rendering its clientside detail entities this frame.${UNSURE}`,
  [["bus", "Entity", "The trolleybus."]],
  [["boolean", "Prevent rendering."]]));

restPages.push(hookPage("Trolleybus_DTVarChanged", "Shared",
  `Called when any DT variable of a trolleybus changes (see the list on the <page text="Trolleybus class page">Trolleybus</page>).`,
  [["value", "any", "The new value."],
   ["bus", "Entity", "The trolleybus."],
   ["name", "string", "DT variable name."]]));

restPages.push(hookPage("Trolleybus_PoleStateChanged", "Shared",
  `Called when a trolley pole state changes (attached, flying off, lowered...).`,
  [["value", "number", "The new pole state."],
   ["bus", "Entity", "The trolleybus."],
   ["right", "boolean", "True for the right pole."]]));

restPages.push(hookPage("PostInit", "Shared",
  `Called once after all addon files have been included on startup.`,
  [], [],
  { fullname: "Trolleybus_System.PostInit" }));

// ---- change events (fired via Trolleybus_System.RunChangeEvent: the hook
// ---- name gets a "Changed" suffix and receives the NEW value first; they
// ---- only fire when the value actually changed)

restPages.push(hookPage("Trolleybus_ButtonChanged", "Server",
  `Called when the held-down state of a trolleybus cabin button changes (see <page>Trolleybus:ButtonIsDown</page>).`,
  [["value", "any", "The new button state."],
   ["bus", "Entity", "The trolleybus."],
   ["button", "string", "Button name."]]));

restPages.push(hookPage("Trolleybus_MultiButtonChanged", "Server",
  `Called when a multi-position switch of a trolleybus changes its position.`,
  [["value", "number", "The new position."],
   ["bus", "Entity", "The trolleybus."],
   ["button", "string", "Button name."]]));

restPages.push(hookPage("Trolleybus_DoorStateChanged", "Server",
  `Called when a trolleybus door starts opening or closing.`,
  [["opened", "boolean", "True when the door is now opening."],
   ["bus", "Entity", "The trolleybus."],
   ["door", "string", "Door name."]]));

restPages.push(hookPage("Trolleybus_ReverseChanged", "Server",
  `Called when the reverse (direction switch) position of a trolleybus changes.`,
  [["state", "number", "The new reverse position."],
   ["bus", "Entity", "The trolleybus."]]));

restPages.push(hookPage("Trolleybus_PoleContactChanged", "Shared",
  `Called when a trolley pole gains or loses contact with a wire.`,
  [["contact", "boolean", "Whether the pole now touches a wire."],
   ["bus", "Entity", "The trolleybus."],
   ["right", "boolean", "True for the right pole."]]));

restPages.push(hookPage("Trolleybus_PoleContactWireChanged", "Shared",
  `Called when the wire a trolley pole is touching changes.`,
  [["wire", "Entity", "The wire now being touched (or NULL)."],
   ["bus", "Entity", "The trolleybus."],
   ["right", "boolean", "True for the right pole."]]));

restPages.push(hookPage("Trolleybus_RenderClientEntsChanged", "Client",
  `Called when a trolleybus starts or stops rendering its clientside detail entities (cabin equipment, panels...).`,
  [["rendering", "boolean", "Whether the details are now rendered."],
   ["bus", "Entity", "The trolleybus."]]));

restPages.push(hookPage("TrafficLight_StateChanged", "Server",
  `Called when a <page text="traffic light">trolleybus_trafficlight</page> switches to another state of its behaviour cycle.`,
  [["state", "number", "The new state index."],
   ["light", "Entity", "The traffic light."]]));

restPages.push(hookPage("ContactNetwork_LoadedStateChanged", "Client",
  `Called clientside when the contact network for the current map finishes loading or is unloaded.`,
  [["loaded", "boolean", "Whether the network is now loaded."]]));

/* ================= Guides ================= */

restPages.push({
  address: "Trolleybus_System",
  title: "Trolleybus_System",
  category: "Trolleybus System/Trolleybus_System",
  markup: `# Trolleybus System

Documentation for the **Garry's Mod Trolleybus System** addon (version Beta 1.1, © Platunov I. M.) — source code: [ShadowBonnieRUS/Garry-s-Mod-Trolleybus-System](https://github.com/ShadowBonnieRUS/Garry-s-Mod-Trolleybus-System). The addon adds drivable trolleybuses with realistic electric circuits, an editable overhead contact network, routes with stops, AI traffic and traffic lights.

Everything lives in the global \`Trolleybus_System\` table.

## Namespaces

| Namespace | Purpose |
|-----------|---------|
| <page text="Trolleybus_System">Trolleybus_System</page> | Core library: events, localization, settings, sounds, builders, utilities |
| <page text="ContactNetwork">Trolleybus_System.ContactNetwork</page> | Overhead wires, suspensions, voltage |
| <page text="Routes">Trolleybus_System.Routes</page> | Routes and stops |
| <page text="NetworkSystem">Trolleybus_System.NetworkSystem</page> | Addon networked variables |
| <page text="DeviceInputModule">Trolleybus_System.DeviceInputModule</page> | External wheels/joysticks support |

The drivable bus base class is documented on the <page text="Trolleybus page">Trolleybus</page>; addon events on the <page text="hooks page">Trolleybus_System_Hooks</page>; bus systems on the <page text="systems page">Trolleybus_System_Systems</page>; entity classes on the <page text="entities page">Trolleybus_System_Entities</page>.

## Editor tools

The addon ships five toolgun tools (superadmin-only by default, see <page>TrolleybusSystem_HasAccessToTool</page>): \`trolleybus_cn_editor\` (contact network), \`trolleybus_routes_editor\`, \`trolleyinformatoreditor\`, \`trolleytrafficeditor\`, \`trolleytrafficlighteditor\`. Map data is stored per map via <page>Trolleybus_System.WriteDataFile</page>; on bundled default maps editing is locked unless <page>TrolleybusSystem_AllowEditingDefaultMaps</page> allows it.

## Settings

* \`Trolleybus_System.Settings\` — per-player settings (draw distances, mirrors, steering...), read with <page>Trolleybus_System.GetPlayerSetting</page>
* \`Trolleybus_System.AdminSettings\` — server convars (bus limit, traffic, network voltage...), read with <page>Trolleybus_System.GetAdminSetting</page>

Traffic tracks, informators and traffic lights are loaded/saved server-side with the corresponding Save/Load functions (\`SaveTrafficTracks\`, \`LoadTrafficTracks\`, \`SaveTrafficLights\`, \`LoadTrafficLights\`, \`SaveInformators\`, \`LoadInformators\`).

<note>ULX integration: when ULX is installed, the addon registers additional admin commands from \`trolleybus_system/commands.lua\`.</note>

<methods/>`,
});

restPages.push({
  address: "Trolleybus_System_Systems",
  title: "Trolleybus systems",
  category: "Trolleybus System",
  markup: `# Trolleybus systems

A **system** is a reusable module of trolleybus equipment: engine, reductor, pneumatics, handbrake, horn, buzzer, heaters, control units (RKSU/TISU/TRSU), voltage converter, battery, informator displays and so on. Systems live in \`lua/trolleybus_system/systems/&lt;name&gt;\` and register themselves with <page>Trolleybus_System.RegisterSystem</page>:

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

* \`SetNWVar(name, value)\` / \`GetNWVar(name, default)\` — networked variables scoped to the system instance (stored as \`sys.&lt;name&gt;:&lt;index&gt;.&lt;var&gt;\` on the bus)
* \`ClearNWVars()\` — removes all variables the instance has set
* \`Unload()\` — called on unload; clears the variables

Instance fields: \`Name\`, \`Index\`, \`Trolleybus\`.

## Bundled systems

accumulatorbattery, agit_132, buzzer, engine, handbrake, heater, horn, hydraulic_booster, interior_heater, ir_2002, motor_ventilator, multiscreen, nameplates, pneumatic, reductor, rksu, staticvoltageconverter, tisu, trsu.`,
});

restPages.push({
  address: "Trolleybus_System_Entities",
  title: "Trolleybus entities",
  category: "Trolleybus System",
  markup: `# Entity classes

## Drivable trolleybuses

All inherit from \`trolleybus_ent_base\` (see the <page text="Trolleybus class">Trolleybus</page>):

| Class | Vehicle |
|-------|---------|
| \`trolleybus_ent_ziu682v013\` | ZiU-682V-013 |
| \`trolleybus_ent_ziu6205\` (+ \`_trailer\`) | ZiU-6205 |
| \`trolleybus_ent_aksm101ps\` | AKSM-101PS |
| \`trolleybus_ent_aksm321\` / \`aksm321n\` | AKSM-321 |
| \`trolleybus_ent_aksm333\` (+ \`_trailer\`) | AKSM-333 |
| \`trolleybus_ent_aksm333o\` / \`aksm333o_msk\` (+ \`_trailer\`) | AKSM-333O |
| \`trolleybus_ent_trolza5265\` | Trolza-5265 "Megapolis" |

Trailer sections inherit from \`trolleybus_ent_base_trailer\`.

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
