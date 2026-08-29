// Core Trolleybus_System library pages.
import { lib, UNSURE } from "./gen.mjs";

export const corePages = [];

/* ---------------- events / language / players ---------------- */

corePages.push(lib("RunEvent", "Shared",
  `Runs an addon event as a global hook. The hook name is \`"TrolleybusSystem_" .. event\`, called via hook.Call with the <page>Trolleybus_System</page> table as the gamemode table, so default handlers can be defined as \`function Trolleybus_System:TrolleybusSystem_EventName(...)\`. See <page text="the hooks list">Trolleybus_System_Hooks</page>.`,
  [["event", "string", "Event name without the \`TrolleybusSystem_\` prefix."],
   ["arguments", "vararg", "Arguments passed to the hook."]],
  [["any", "The value returned by the first hook that returned something."]]));

corePages.push(lib("RunChangeEvent", "Shared",
  `Fires <page text="an addon event">Trolleybus_System.RunEvent</page> named \`event .. "Changed"\`, but only when the two given values differ. Used internally to fire events like <page>TrolleybusSystem_Trolleybus_PoleStateChanged</page>.`,
  [["event", "string", "Base event name (without the \`Changed\` suffix)."],
   ["oldvalue", "any", "The previous value."],
   ["value", "any", "The new value. The event fires only if it differs from the previous value."],
   ["arguments", "vararg", "Extra arguments passed to the event after the new value."]]));

corePages.push(lib("GetLanguagePhrase", "Client",
  `Returns the localized phrase for \`"trolleybus_system." .. phrase\`. Format-style arguments are substituted and the \`|n\` sequence is converted to a newline. Localization files live in \`resource/localization/en\` and \`ru\`.`,
  [["phrase", "string", "Phrase key without the \`trolleybus_system.\` prefix."],
   ["arguments", "vararg", "Values for string.format placeholders inside the phrase."]],
  [["string", "The translated phrase, or the key itself when no translation exists."],
   ["boolean", "true when the phrase was not found."]]));

corePages.push(lib("GetLanguagePhraseName", "Client",
  `Like <page>Trolleybus_System.GetLanguagePhrase</page> but for names with an optional prefix: returns the raw \`phrase\` when no translation for \`prefix .. phrase\` exists. Used for route, stop and other user-provided names.`,
  [["prefix", "string", "Phrase key prefix, e.g. \`\"route.gm_sumy_reborn.\"\`."],
   ["phrase", "string", "Name/key to translate."],
   ["arguments", "vararg", "Values for format placeholders."]],
  [["string", "Translated name, or the raw name if no phrase exists."]]));

corePages.push(lib("PlayerInDriverPlace", "Shared",
  `Returns whether the player sits in the driver seat of the given trolleybus. When \`bus\` is nil, checks whether the player is the driver of any trolleybus.`,
  [["bus", "Entity", "The trolleybus to check, or nil for any."],
   ["ply", "Player", "The player to check."]],
  [["boolean", "True if the player is in a trolleybus driver seat."]]));

corePages.push(lib("CanPressButtons", "Shared",
  `Returns whether the player is currently able to press cabin buttons of the given trolleybus — either from a passenger/driver seat that allows it, or from outside while holding the \`trolleybus_clicker\` weapon near the bus.`,
  [["bus", "Entity", "The trolleybus to check against, or nil for any."],
   ["ply", "Player", "The player to check."]],
  [["boolean", "True when button presses are allowed."]]));

corePages.push(lib("GetSeatTrolleybus", "Shared",
  `Returns the trolleybus a seat vehicle belongs to.`,
  [["seat", "Vehicle", "A seat entity created by a trolleybus."]],
  [["Entity", "The owning trolleybus, or NULL."]]));

corePages.push(lib("IsTrolleybusMetatable", "Shared",
  `Returns whether a scripted entity table inherits from \`trolleybus_ent_base\` (trailers excluded). Follows the whole \`Base\` chain.`,
  [["ENT", "table", "The scripted entity table to check."]],
  [["boolean", "True for trolleybus entity classes."]]));

corePages.push(lib("ToolsDisallowed", "Shared",
  `Returns whether the addon's editor tools are blocked for the player. Editing is blocked on bundled default maps unless allowed via the <page>TrolleybusSystem_AllowEditingDefaultMaps</page> hook. Serverside a warning message and sound are sent unless \`nowarning\` is set.`,
  [["ply", "Player", "The player using the tool."],
   ["tool", "string", "Tool class name, or nil to check the map restriction only."],
   ["nowarning", "boolean", "Suppress the warning notification.", "false"]],
  [["boolean", "True when the tool may not be used."]]));

corePages.push(lib("IsEditingDefaultMapsAllowed", "Shared",
  `Returns whether editing the bundled default maps (e.g. \`gm_sumy_reborn\`) is allowed. Controlled by the <page>TrolleybusSystem_AllowEditingDefaultMaps</page> hook; by default only in singleplayer.`,
  [],
  [["boolean", "True when editing default map data is allowed."]]));

corePages.push(lib("TurnSignalTickActive", "Shared",
  `Returns the blink phase of a turn signal for the given entity: cycles on/off with a period of 0.66 seconds based on the entity creation time.`,
  [["ent", "Entity", "The trolleybus (used for phase offset)."]],
  [["boolean", "True while the lamp should be lit."]]));

corePages.push(lib("CopyValue", "Shared",
  `Deep-copies a value: tables are copied recursively, Vector and Angle values are cloned, everything else is returned as-is.`,
  [["value", "any", "The value to copy."]],
  [["any", "The copied value."]]));

/* ---------------- registries ---------------- */

corePages.push(lib("GetTrafficTracks", "Shared",
  `Returns the table of traffic tracks for the current map (paths that AI traffic cars drive along), as edited with the Traffic Editor tool.`,
  [], [["table", "Traffic tracks registry."]]));

corePages.push(lib("GetInformators", "Shared",
  `Returns the table of informators for the current map — announcement configurations played inside trolleybuses, edited with the Informator Editor tool.`,
  [], [["table", "Informators registry."]]));

corePages.push(lib("AddTrafficLightLense", "Shared",
  `Registers a traffic light lense (section) type by name and assigns it an ID. Used inside the <page>TrolleybusSystem_RegisterTrafficLightTypes</page> hook.`,
  [["name", "string", "Unique lense name."],
   ["data", "table", "Lense definition. The \`ID\` field is filled automatically."]]));

/* ---------------- systems framework ---------------- */

corePages.push(lib("RegisterSystem", "Shared",
  `Registers a trolleybus system (engine, pneumatics, doors buzzer, ...) under the given name. Already spawned buses using this system are updated in place. See <page text="the systems guide">Trolleybus_System_Systems</page> for the SYSTEM table structure.`,
  [["name", "string", "Unique system name."],
   ["data", "table", "The SYSTEM definition table."]]));

corePages.push(lib("LoadSystem", "Shared",
  `Creates an instance of a registered system on a trolleybus and calls its \`Initialize\` method. Usually called through <page>Trolleybus:LoadSystem</page> in the bus's \`LoadSystems\`.`,
  [["bus", "Entity", "The trolleybus."],
   ["name", "string", "Registered system name."],
   ["defvalues", "table", "Field overrides copied into the instance."],
   ["index", "string", "Instance index, allowing several instances of one system.", "\"0\""]],
  [["table", "The created system instance."]]));

corePages.push(lib("UnloadSystem", "Shared",
  `Removes a system instance from a trolleybus, calling its \`Unload\` method (which clears the system's networked variables).`,
  [["bus", "Entity", "The trolleybus."],
   ["name", "string", "Registered system name."],
   ["index", "string", "Instance index.", "\"0\""]]));

/* ---------------- settings ---------------- */

corePages.push(lib("GetPlayerSetting", "Shared",
  `Returns the value of a user setting listed in \`Trolleybus_System.Settings\` (draw distances, mouse steer sensitivity and so on), clamped/normalized to the setting definition.

<note>The signatures differ by realm: serverside the function is \`Trolleybus_System.GetPlayerSetting(ply, name)\` and reads settings the client has networked; clientside it is \`Trolleybus_System.GetPlayerSetting(name)\` for the local player.</note>`,
  [["ply", "Player", "(Serverside only) The player whose setting to read."],
   ["name", "string", "Setting name, e.g. \`\"TrolleybusDrawDistance\"\`."]],
  [["any", "The setting value, or nil for unknown/ConCommand settings."]]));

corePages.push(lib("GetAdminSetting", "Server",
  `Returns the value of an admin setting (a console variable listed in \`Trolleybus_System.AdminSettings\`, e.g. \`trolleybus_max_trolleybuses\`).`,
  [["name", "string", "ConVar name of the admin setting."]],
  [["any", "The current value, or nil for unknown settings."]]));

/* ---------------- bass sounds ---------------- */

corePages.push(lib("PlayBassSound", "Shared",
  `Plays a sound file on an entity through the addon's BASS sound system. Serverside broadcasts to all players (and to players who connect later); clientside creates the sound locally and returns its data table.`,
  [["ent", "Entity", "Entity to play the sound on."],
   ["snd", "string", "Sound file path relative to \`garrysmod/sound\`."],
   ["dist", "number", "Maximum audible distance."],
   ["volume", "number", "Maximum volume."],
   ["loop", "boolean", "Loop the sound.", "false"],
   ["time", "number", "CurTime-based moment used as the playback start point."],
   ["lpos", "Vector", "Sound position local to the entity."],
   ["prate", "number", "(Clientside only) Playback rate."]],
  [["table", "(Clientside only) The internal sound data table."]]));

corePages.push(lib("PlayBassSoundSimple", "Shared",
  `Plays a one-shot, non-critical sound on an entity through the BASS sound system (serverside sent unreliably to players in hearing range; not resent to newly connected players).`,
  [["ent", "Entity", "Entity to play the sound on."],
   ["snd", "string", "Sound file path relative to \`garrysmod/sound\`."],
   ["dist", "number", "Maximum audible distance."],
   ["volume", "number", "Maximum volume."],
   ["time", "number", "CurTime-based playback start point."],
   ["lpos", "Vector", "Sound position local to the entity."],
   ["prate", "number", "(Clientside only) Playback rate."]]));

corePages.push(lib("StopBassSound", "Shared",
  `Stops a sound started with <page>Trolleybus_System.PlayBassSound</page> on the given entity.`,
  [["ent", "Entity", "The entity the sound plays on."],
   ["snd", "string", "The sound file path used to start it."],
   ["fullremove", "boolean", "(Clientside only) Remove the sound channel entirely instead of fading it out."]]));

corePages.push(lib("StopAllBassSounds", "Shared",
  `Stops every BASS sound playing on the given entity.`,
  [["ent", "Entity", "The entity to silence."]]));

corePages.push(lib("IsBassSoundPlaying", "Client",
  `Returns whether the given BASS sound is currently audible on the entity.`,
  [["ent", "Entity", "The entity."],
   ["snd", "string", "The sound file path."]],
  [["boolean", "True while the sound is playing."]]));

corePages.push(lib("GetBassSoundData", "Client",
  `Returns the internal data table of a BASS sound on the entity (fields like \`volume\`, \`prate\`, \`shouldplay\`, \`sound\` — the IGModAudioChannel). Can be used to tweak a playing sound.`,
  [["ent", "Entity", "The entity."],
   ["snd", "string", "The sound file path."]],
  [["table", "Sound data table, or nil."]]));

/* ---------------- data files / networking ---------------- */

corePages.push(lib("WriteDataFile", "Server",
  `Writes map-bound addon data (routes, contact network, traffic tracks, ...) to \`data/trolleybussystem/&lt;map&gt;/&lt;type&gt;.txt\`. Does nothing on bundled default maps unless editing them is allowed.`,
  [["type", "string", "Data file name, e.g. \`\"routes\"\`, \`\"contactnetwork\"\`."],
   ["data", "string", "The contents (usually JSON)."]]));

corePages.push(lib("ReadDataFile", "Server",
  `Reads map-bound addon data. Falls back to the data shipped with the addon (\`lua/trolleybus_system/data/&lt;map&gt;/&lt;type&gt;.lua\`) when no user file exists or when the map is a protected default map.`,
  [["type", "string", "Data file name."]],
  [["string", "The file contents, or nil."]]));

corePages.push(lib("SendMassiveData", "Server",
  `Sends an arbitrarily large table to players, split into ~60KB net message chunks in the background. The client receives it via <page>Trolleybus_System.ReceiveMassiveData</page> with the same callback name.`,
  [["plys", "table", "Player or table of players; nil sends to all human players."],
   ["data", "table", "The table to transfer."],
   ["callback", "string", "Receiver callback name registered on the client."]]));

corePages.push(lib("ReceiveMassiveData", "Client",
  `Registers a receiver for tables sent from the server with <page>Trolleybus_System.SendMassiveData</page>.`,
  [["callback", "string", "Callback name (matches the sender's)."],
   ["func", "function", "Called with the received table once the transfer completes."]]));

corePages.push(lib("PlayerMessage", "Server",
  `Shows a notification to a player (or to everyone) in the bottom-right corner. Arguments are substituted into the format string clientside; string arguments starting with \`#\` are localized via <page>Trolleybus_System.GetLanguagePhrase</page>.`,
  [["ply", "Player", "Recipient, or nil to broadcast."],
   ["type", "number", "NOTIFY_ enum type of the notification."],
   ["format", "string", "Format string."],
   ["arguments", "vararg", "Format arguments."]]));

corePages.push(lib("SetOwner", "Server",
  `Marks a player as the owner of an entity, integrating with prop protection (CPPI) when available. Used for spawned trolleybuses, their wheels and seats.`,
  [["ent", "Entity", "The entity."],
   ["ply", "Player", "The owner."]]));

corePages.push(lib("SetPreventTransmit", "Server",
  `Wrapper over Entity:SetPreventTransmit that additionally remembers the state, so it can be read back with <page>Trolleybus_System.GetPreventTransmit</page>.`,
  [["ent", "Entity", "The entity."],
   ["ply", "Player", "The player."],
   ["stop", "boolean", "True to stop transmitting the entity to the player."]]));

corePages.push(lib("GetPreventTransmit", "Server",
  `Returns the transmit-prevention state previously set with <page>Trolleybus_System.SetPreventTransmit</page>.`,
  [["ent", "Entity", "The entity."],
   ["ply", "Player", "The player."]],
  [["boolean", "True when transmitting is prevented."]]));

corePages.push(lib("UpdateTransmit", "Server",
  `Once per second updates PVS/distance-based transmitting of an entity to every player, using the given per-player draw distance setting (e.g. \`\"TrolleybusDrawDistance\"\`).`,
  [["ent", "Entity", "The entity to manage."],
   ["setting", "string", "Name of the distance setting from \`Trolleybus_System.Settings\`."]]));

corePages.push(lib("IsButtonDown", "Server",
  `Returns whether a player currently holds the given trolleybus control button (as networked from the client's control bindings).`,
  [["ply", "Player", "The player."],
   ["button", "string", "Control name, e.g. \`\"acceleration\"\`, \`\"horn\"\`."]],
  [["boolean", "True while the button is held."]]));

corePages.push(lib("IsButtonsDown", "Shared",
  `Checks one or several buttons at once.

<note>Signatures differ by realm: serverside \`IsButtonsDown(ply, btns, any)\` checks the player's networked trolleybus controls; clientside \`IsButtonsDown(btns, any)\` checks raw input.IsButtonDown states.</note>`,
  [["ply", "Player", "(Serverside only) The player."],
   ["btns", "any", "A BUTTON_CODE or a table of button codes / control names."],
   ["any", "boolean", "When true, returns true if at least one button is down; otherwise all must be down.", "false"]],
  [["boolean", "The check result."]]));

/* ---------------- controls ---------------- */

corePages.push(lib("IsControlButtonDown", "Shared",
  `Returns whether the local player's key bound to the given control is held. With a trolleybus passed, checks the bus-specific hotkey binding instead of the global control.

<note>Exists on both realms; on the server it works with controls networked from the client.</note>`,
  [["button", "string", "Control name (e.g. \`\"mousesteer\"\`, \`\"handbrake\"\`) or a bus button name when \`troll\` is given."],
   ["troll", "Entity", "Optional trolleybus for per-bus hotkeys."]],
  [["boolean", "True while held."]]));

corePages.push(lib("TrollButtonToPlayerControlKey", "Shared",
  `Returns the key (or key combination) the player has bound for a specific trolleybus cabin button, falling back to the button's default hotkey.`,
  [["troll", "Entity", "The trolleybus."],
   ["button", "string", "Cabin button name."]],
  [["any", "BUTTON_CODE or table of codes."]]));

corePages.push(lib("SystemButtonToPlayerControlKey", "Shared",
  `Returns the key bound for a button belonging to a registered trolleybus system, falling back to the system's default hotkey.`,
  [["system", "string", "Registered system name."],
   ["button", "string", "System button name."]],
  [["any", "BUTTON_CODE or table of codes."]]));

corePages.push(lib("GetHotkeyButtons", "Shared",
  `Resolves the hotkey for a cabin button of a trolleybus, whether it is bound through the bus itself or through one of its systems.`,
  [["troll", "Entity", "The trolleybus."],
   ["button", "string", "Button name."]],
  [["any", "BUTTON_CODE or table of codes, or nil when the button has no hotkey."]]));

/* ---------------- vehicles / physics ---------------- */

corePages.push(lib("CreateWheel", "Server",
  `Creates a \`trolleybus_wheel\` entity for a bus and constrains it with ropes, elastic constraints and nocollide, forming the suspension. Returns the wheel.`,
  [["bus", "Entity", "The trolleybus."],
   ["wheeltype", "string", "Registered wheel type name."],
   ["pos", "Vector", "Wheel position local to the bus."],
   ["ang", "Angle", "Wheel angles local to the bus."],
   ["height", "number", "Suspension travel used for initial placement."],
   ["constant", "number", "Elastic constraint spring constant."],
   ["damping", "number", "Elastic damping."],
   ["rdamping", "number", "Elastic rotational damping."],
   ["times", "number", "How many elastic constraints to stack.", "1"],
   ["isdrive", "boolean", "Marks the wheel as a drive wheel.", "false"],
   ["invert", "boolean", "Invert the visual rotation direction.", "false"],
   ["mass", "number", "Wheel mass; defaults to a quarter of the bus mass."]],
  [["Entity", "The created wheel."]]));

corePages.push(lib("MultiplyWheelConstant", "Server",
  `Multiplies the spring constant of the elastic constraints between a bus and one of its wheels — e.g. to simulate kneeling or load.`,
  [["bus", "Entity", "The trolleybus."],
   ["wheel", "Entity", "The wheel."],
   ["mp", "number", "Multiplier applied to the current constant."]]));

corePages.push(lib("ForceFlyOffPole", "Server",
  `Forces a trolley pole of the bus to fly off the wires (state, timing and pole animation are set up as if it detached naturally).`,
  [["bus", "Entity", "The trolleybus."],
   ["right", "boolean", "True for the right pole, false for the left."]]));

corePages.push(lib("ElectricSpark", "Shared",
  `Creates an electric spark effect (with sound) at the given position. Serverside broadcasts the effect to players in PVS; clientside spawns the visual effect locally.`,
  [["pos", "Vector", "World position of the spark."]]));

/* ---------------- eyes / client rendering ---------------- */

corePages.push(lib("EyePos", "Shared",
  `Serverside: returns the eye position of a player (\`ply:EyePos()\`). Clientside: takes no arguments and returns the camera position of the frame being rendered (cached from the RenderScene hook) — safe to use outside rendering hooks.`,
  [["ply", "Player", "(Serverside only) The player."]],
  [["Vector", "The eye/camera position."]]));

corePages.push(lib("EyeAngles", "Client",
  `Returns the camera angles of the frame being rendered (cached from the RenderScene hook).`,
  [], [["Angle", "Camera angles."]]));

corePages.push(lib("EyeVector", "Client",
  `Returns the camera forward direction of the frame being rendered.`,
  [], [["Vector", "Normalized view direction."]]));

corePages.push(lib("EyeFOV", "Client",
  `Returns the field of view of the frame being rendered.`,
  [], [["number", "FOV in degrees."]]));

corePages.push(lib("CreatePassenger", "Client",
  `Creates a clientside passenger model (random model and idle sequence from the addon's passenger pools) that draws itself only within the PassengersDrawDistance setting.`,
  [], [["CSEnt", "The passenger model."]]));

corePages.push(lib("CreatePixVisUHandle", "Client",
  `Creates a universal pixel-visibility handle that works correctly both in the main view and in trolleybus mirror render passes (a separate PixVis handle per mirror).`,
  [], [["table", "Handle object with a \`PixelVisible(pos, size)\` method."]]));

corePages.push(lib("MarkEntityAsDrawnThisFrame", "Client",
  `Remembers that the entity was already drawn in the current frame (opaque or translucent pass), preventing duplicated rendering between the world and mirror passes.`,
  [["ent", "Entity", "The entity."],
   ["translucent", "boolean", "True for the translucent render pass."]]));

corePages.push(lib("IsEntityWasDrawnThisFrame", "Client",
  `Returns whether the entity was marked as drawn in the current frame with <page>Trolleybus_System.MarkEntityAsDrawnThisFrame</page>.`,
  [["ent", "Entity", "The entity."],
   ["translucent", "boolean", "True for the translucent render pass."]],
  [["boolean", "True if already drawn this frame."]]));

corePages.push(lib("ButtonsToString", "Client",
  `Converts a button code or a table of button codes into a human-readable name like \`\"LSHIFT+W\"\`.`,
  [["btns", "any", "BUTTON_CODE or table of codes."]],
  [["string", "Readable key combination."]]));

corePages.push(lib("CreateWorkSound", "Client",
  `Creates a start/loop/end sound set for a device on an entity (e.g. a compressor): when activated it plays the start sounds, then loops; on deactivation it plays the end sounds. Returns an object with \`SetActive\`, \`Play\`, \`Stop\`, \`SetVolume\`, \`SetPlaybackRate\`, \`IsActive\`, \`Remove\` methods.`,
  [["ent", "Entity", "The entity the sound belongs to."],
   ["lpos", "Vector", "Local sound position."],
   ["dist", "number", "Maximum audible distance."],
   ["volume", "number", "Volume."],
   ["prate", "number", "Playback rate."],
   ["startsnds", "table", "Sound path or list of paths played on activation."],
   ["loopsnd", "string", "Looping work sound."],
   ["endsnds", "table", "Sound path or list of paths played on deactivation."]],
  [["table", "The WorkSound object."]]));

corePages.push(lib("CreateInsideOutsideSound", "Client",
  `Creates a pair of <page text="work sounds">Trolleybus_System.CreateWorkSound</page> that crossfade between an outside and an inside variant depending on whether the local camera is inside the trolleybus.`,
  [["ent", "Entity", "The entity."],
   ["lpos", "Vector", "Local sound position."],
   ["dist", "number", "Maximum audible distance."],
   ["volume1", "number", "Outside volume."],
   ["volume2", "number", "Inside volume."],
   ["prate", "number", "Playback rate."],
   ["startsnds1", "table", "Outside start sound(s)."],
   ["loopsnd1", "string", "Outside loop sound."],
   ["endsnds1", "table", "Outside end sound(s)."],
   ["startsnds2", "table", "Inside start sound(s)."],
   ["loopsnd2", "string", "Inside loop sound."],
   ["endsnds2", "table", "Inside end sound(s)."],
   ["swaptime", "number", "Crossfade time in seconds.", "1"]],
  [["table", "The InsideOutsideSound object."]]));

corePages.push(lib("CreateMultiSound", "Client",
  `Creates a speed-driven set of looping sounds (used for engine/reductor sounds): each configured sound fades in and out over its own speed range and can change playback rate with speed.`,
  [["ent", "Entity", "The entity."],
   ["lpos", "Vector", "Local sound position."],
   ["dist", "number", "Maximum audible distance."],
   ["volumemp", "number", "Overall volume multiplier."],
   ["soundscfg", "table", "List of sound configs: \`sound\`, \`volume\`, \`prate\`, \`startspd\`, \`endspd\`, \`fadein\`, \`fadeout\`, \`pratemp\`, \`pratestart\`."],
   ["getspd", "function", "Function returning the current speed value."]],
  [["table", "The MultiSound object."]]));

corePages.push(lib("CreateTexturedPoly", "Client",
  `Creates a drawable textured polygon object from a list of 2D vertices; used for schedule displays and similar flat surfaces. The object has SetPos/SetAngles/SetColor/SetUV/SetMaterial and a \`Draw(is3d)\` method rendering the polygon as triangles.`,
  [["verts", "table", "List of 2D vertices."],
   ["mat", "IMaterial", "Material to draw with."]],
  [["table", "The TexturedPoly object."]]));

/* ---------------- geometry / builder helpers ---------------- */

corePages.push(lib("BuildRotationPositions", "Shared",
  `Builds a list of points forming a smooth curve between two positions, curving inside the coordinate space of \`ang\`. Used for trolley wires and route geometry.`,
  [["p1", "Vector", "Curve start."],
   ["p2", "Vector", "Curve end."],
   ["ang", "Angle", "Orientation the curve is built in."],
   ["segments", "number", "Number of segments."],
   ["curvature", "number", "Curvature power."],
   ["invert", "boolean", "Invert the curve side.", "false"]],
  [["table", "List of Vector points (segments + 1 entries)."]]));

corePages.push(lib("GetLinesIntersectPosition", "Shared",
  `Returns the intersection point of two 2D lines given as point + direction, or nothing when the lines are parallel.`,
  [["l1x", "number", "Line 1 point X."], ["l1y", "number", "Line 1 point Y."],
   ["l1dx", "number", "Line 1 direction X."], ["l1dy", "number", "Line 1 direction Y."],
   ["l2x", "number", "Line 2 point X."], ["l2y", "number", "Line 2 point Y."],
   ["l2dx", "number", "Line 2 direction X."], ["l2dy", "number", "Line 2 direction Y."]],
  [["number", "Intersection X, or nil."], ["number", "Intersection Y."]]));

corePages.push(lib("GetLinesIntersectPosition3D", "Shared",
  `Returns the approximate crossing point of two 3D lines given as position + angle (averaged between both lines' planes).`,
  [["pos1", "Vector", "Line 1 origin."], ["ang1", "Angle", "Line 1 orientation."],
   ["pos2", "Vector", "Line 2 origin."], ["ang2", "Angle", "Line 2 orientation."]],
  [["Vector", "The crossing position, or nil."]]));

corePages.push(lib("BuildNameplatePanel", "Shared",
  `Builds a route nameplate panel for a trolleybus (front/side/rear route displays) together with hidden prev/next buttons that cycle the current route number. Accepts either an ENT table (during class setup) or a spawned entity — in the latter case returns a removal function.`,
  [["ENT", "any", "ENT table or trolleybus entity."],
   ["index", "string", "Unique panel index."],
   ["pos", "Vector", "Panel position local to the bus."],
   ["ang", "Angle", "Panel angles."],
   ["w", "number", "Panel width."],
   ["h", "number", "Panel height."],
   ["type", "number", "Layout: 0 = route number, 1 = start/end stacked, 2 = number + start/end."],
   ["font", "string", "Main font."],
   ["font2", "string", "Secondary font (layout 2)."],
   ["drawscale", "number", "Draw scale."],
   ["glowcolor", "Color", "Glow color when the schedule light is on.", "Color(255,155,0)"],
   ["glowonly", "boolean", "Draw only while glowing.", "false"]],
  [["function", "Removal function (only when called on a spawned entity)."]]));

corePages.push(lib("BuildDialGauge", "Shared",
  `Builds an animated dial gauge (speedometer, ammeter, pressure gauge...) on a cabin panel: places a needle model and rotates it every frame according to the value returned by \`addang\`.`,
  [["ENT", "any", "ENT table or trolleybus entity."],
   ["index", "string", "Unique element index."],
   ["name", "string", "Display name."],
   ["panel", "string", "Cabin panel name to attach to."],
   ["x", "number", "X position on the panel."],
   ["y", "number", "Y position on the panel."],
   ["radius", "number", "Interaction radius."],
   ["startang", "number", "Initial needle rotation."],
   ["addang", "function", "\`function(system, ent)\` returning the needle angle."],
   ["model", "string", "Needle model.", "\"models/trolleybus/strspeed.mdl\""],
   ["offsetang", "Angle", "Model angle offset.", "Angle(90,0,0)"],
   ["offsetpos", "Vector", "Model position offset."],
   ["scale", "number", "Model scale."],
   ["color", "Color", "Model color."],
   ["skin", "number", "Model skin."],
   ["bg", "string", "Bodygroups string."]],
  [["function", "Removal function (only when called on a spawned entity)."]]));

corePages.push(lib("BuildMultiButton", "Shared",
  `Builds a multi-position switch on a cabin panel: two invisible half-buttons (left/right or up/down) change an integer state stored in the \`MultiBtns.&lt;index&gt;\` networked variable, and a knob model animates to the state via a pose parameter or animation cycle.`,
  [["ENT", "table", "The ENT table (class setup only)."],
   ["index", "string", "Unique switch index."],
   ["panel", "string", "Cabin panel name."],
   ["leftname", "string", "Left/decrease button caption."],
   ["rightname", "string", "Right/increase button caption."],
   ["model", "table", "Knob model config: \`model\`, \`poseparameter\`/\`anim\`, \`sounds\`, offsets."],
   ["x", "number", "X position."], ["y", "number", "Y position."],
   ["w", "number", "Width."], ["h", "number", "Height."],
   ["posestatefunc", "function", "Maps button state to pose value."],
   ["onleft", "function", "Called before decreasing; return false to block."],
   ["onright", "any", "Called before increasing (true reuses onleft); return false to block."],
   ["reset", "boolean", "Spring-loaded: state returns to 0 on release."],
   ["lefthotkey", "any", "Hotkey for the left button."],
   ["righthotkey", "any", "Hotkey for the right button."],
   ["leftmax", "number", "Minimum state.", "-1"],
   ["rightmax", "number", "Maximum state.", "1"],
   ["leftexternalkey", "number", "External controller button for left."],
   ["rightexternalkey", "number", "External controller button for right."],
   ["vertical", "boolean", "Stack the half-buttons vertically.", "false"]]));

corePages.push(lib("BuildReverseButton", "Shared",
  `Builds a reverse (direction) switch socket on a cabin panel. The middle button inserts/removes the physical reverse handle (the \`trolleybus_clicker\` weapon carries it between buses), left/right move it between -1/0/1 through <page>Trolleybus:ChangeReverse</page>.`,
  [["ENT", "table", "The ENT table."],
   ["index", "string", "Unique index."],
   ["panel", "string", "Cabin panel name."],
   ["leftname", "string", "Backward position caption."],
   ["middlename", "string", "Insert/remove handle caption."],
   ["rightname", "string", "Forward position caption."],
   ["model", "table", "Handle model config."],
   ["x", "number", "X position."], ["y", "number", "Y position."],
   ["w", "number", "Width."], ["h", "number", "Height."],
   ["lefthotkey", "any", "Hotkey for backward."],
   ["mainhotkey", "any", "Hotkey for insert/remove."],
   ["righthotkey", "any", "Hotkey for forward."],
   ["customfunc", "function", "Replaces ChangeReverse; \`function(bus, newstate)\` returning success."]]));

corePages.push(lib("BuildInteriorNameplate", "Shared",
  `Builds an interior running-line display (ticker) that scrolls the text returned by \`gettext\` across a stencil-masked panel.`,
  [["ENT", "any", "ENT table or trolleybus entity."],
   ["index", "string", "Unique index."],
   ["pos", "Vector", "Panel position local to the bus."],
   ["ang", "Angle", "Panel angles."],
   ["w", "number", "Width."], ["h", "number", "Height."],
   ["gettext", "function", "Returns the text to scroll (or nil for blank)."],
   ["font", "string", "Font."],
   ["speed", "number", "Scroll speed."],
   ["color", "Color", "Text color."],
   ["scale", "number", "Draw scale."]],
  [["function", "Removal function (only when called on a spawned entity)."]]));

corePages.push(lib("BuildMovingMirror", "Shared",
  `Builds an adjustable exterior mirror: an interactive panel lets players bend the mirror arm and glass (bone manipulation within the given limits, synced through networked variables), and registers the reflective mirror surface clientside.`,
  [["ENT", "table", "The ENT table."],
   ["index", "string", "Unique index."],
   ["pos", "Vector", "Adjustment panel position."],
   ["ang", "Angle", "Adjustment panel angles."],
   ["w", "number", "Panel width."], ["h", "number", "Panel height."],
   ["model", "string", "Mirror model."],
   ["mpos", "Vector", "Mirror model local position."],
   ["mang", "Angle", "Mirror model local angles."],
   ["handlebone", "string", "Arm bone name."],
   ["mirrorbone", "string", "Glass bone name."],
   ["lpos", "Vector", "Reflection surface local position."],
   ["lang", "Angle", "Reflection surface angles."],
   ["mw", "number", "Reflection width."], ["mh", "number", "Reflection height."],
   ["handlepitch", "boolean", "Arm can pitch as well as yaw."],
   ["mirrorpitch", "boolean", "Glass can pitch as well as yaw."],
   ["hymin", "number", "Arm yaw min."], ["hymax", "number", "Arm yaw max."],
   ["mymin", "number", "Glass yaw min."], ["mymax", "number", "Glass yaw max."],
   ["hpmin", "number", "Arm pitch min."], ["hpmax", "number", "Arm pitch max."],
   ["mpmin", "number", "Glass pitch min."], ["mpmax", "number", "Glass pitch max."],
   ["mverts", "table", "Complex mirror surface vertices."],
   ["hdefy", "number", "Default arm yaw.", "0"],
   ["mdefy", "number", "Default glass yaw.", "0"],
   ["hdefp", "number", "Default arm pitch.", "0"],
   ["mdefp", "number", "Default glass pitch.", "0"]]));

corePages.push(lib("CreateMirror", "Client",
  `Creates a clientside reflective mirror surface used by trolleybus exterior and interior mirrors.${UNSURE}`,
  [["...", "vararg", "Mirror configuration (entity, local position/angles, size)."]],
  [["table", "The mirror object."]]));

/* ---------------- misc objects ---------------- */

corePages.push(lib("CreateElectricCircuit", "Shared",
  `Creates an electric circuit simulation object used by the buses' electrics: build a chain of elements (resistances, switches, nodes with parallel branches) and update it with a voltage to compute per-element amperage and voltage drops.

Main methods: \`AddElement(data, name)\`, \`AddNodeElement(name)\`, \`BuildFromData(data)\`, \`Build()\`, \`Update(voltage)\`, \`GetElement(name)\`, \`GetAmperage(element)\`, \`GetVoltage(el1, el2)\`, \`GetResistance()\`, \`HasPower()\`.`,
  [],
  [["table", "The ElectricCircuit object."]]));

corePages.push(lib("CreatePseudoAsyncTask", "Shared",
  `Runs a function as a time-sliced coroutine: every tick/frame all active tasks share a time budget proportional to their priorities, so heavy work (contact network building, file parsing) does not freeze the game. The task object provides \`Pause\`, \`UnPause\`, \`Cancel\`, \`Yield\`, \`Sleep(time)\`, \`SetPriority\`, \`GetStatus\`, \`IsPaused\`, \`IsValid\`.`,
  [["task", "function", "The task body; receives the task object."],
   ["priority", "number", "Time-slice priority.", "1"]],
  [["table", "The task object."]]));

/* ---------------- skins ---------------- */

corePages.push(lib("AddTrolleybusSkin", "Shared",
  `Registers a livery (paint scheme) for a trolleybus class within a skin group. Called from the <page>TrolleybusSystem_AddTrolleybusSkins</page> hook to add custom skins.`,
  [["troll", "string", "Trolleybus entity class name."],
   ["group", "string", "Skin group, e.g. body or handrails group of the model."],
   ["name", "string", "Displayed skin name (empty textures table registers the default skin)."],
   ["textures", "table", "Material overrides for the skin."],
   ["preview", "string", "Preview image path."],
   ["bortnums", "table", "Board-number texture configuration."]]));

corePages.push(lib("BuildSkinSpawnSetting", "Shared",
  `Builds the spawn-settings entry (ComboBox with previews) listing all registered skins of a group for a trolleybus class.${UNSURE}`,
  [["troll", "string", "Trolleybus entity class name."],
   ["name", "string", "Skin group name."]],
  [["table", "Spawn setting definition."]]));

corePages.push(lib("GetTrolleybusBortNumberSkinTexture", "Shared",
  `Returns the texture used for painted board numbers of a trolleybus for the given skin, generating/composing it when needed.${UNSURE}`,
  [["self", "Entity", "The trolleybus."],
   ["troll", "string", "Trolleybus class name."],
   ["group", "string", "Skin group."],
   ["skin", "string", "Skin name."],
   ["deftexpath", "string", "Default texture path."],
   ["texpath", "string", "Texture path override."]],
  [["string", "Texture path."]]));
