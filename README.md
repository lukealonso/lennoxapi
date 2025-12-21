# lennoxapi

TypeScript API for controlling Lennox S30, S40, E30, and M30 thermostats via local LAN connection. No cloud required.

## Features

- **Local Control**: Communicates directly with your thermostat over your local network
- **No Cloud Dependency**: Works without Lennox cloud services
- **Full Thermostat Control**: Temperature setpoints, HVAC modes, fan modes, humidity
- **Zone Support**: Works with single-zone and multi-zone systems
- **Single Setpoint Mode**: Supports Lennox's "Perfect Temp" / auto mode with single temperature target
- **Additional Features**: Away mode, ventilation, allergen defender, outdoor temperature

## Installation

```bash
npm install lennoxapi
```

## Usage

```typescript
import { S30API } from 'lennoxapi';

const api = new S30API({
  ipAddress: '192.168.1.100',
  protocol: 'https',
});

// Connect to thermostat
await api.serverConnect();

// Get the system
const system = api.getSystem('LCC');
await api.subscribe(system);

// Poll for data
for (let i = 0; i < 60; i++) {
  await api.messagePump();
  if (system.configComplete() && system.zones.length > 0) break;
}

// Read current state
console.log('System:', system.name);
console.log('Outdoor temp:', system.outdoorTemperature);

const zone = system.getZone(0);
console.log('Zone temp:', zone.temperature);
console.log('Setpoint:', zone.sp);

// Control the thermostat
await zone.setHvacMode('cool');
await zone.setCoolSetpoint(72);
await zone.setFanMode('on');

// Cleanup
await api.shutdown();
```

## API Reference

### S30API

Main API class for connecting to thermostats.

- `serverConnect()` - Establish connection
- `subscribe(system)` - Subscribe to system updates
- `messagePump()` - Poll for updates (returns true if message received)
- `shutdown()` - Close connection

### LennoxSystem

Represents the thermostat system.

- `name` - System name (e.g., "Downstairs")
- `productType` - Model (e.g., "S40")
- `outdoorTemperature` - Outdoor temperature (if available)
- `manualAwayMode` - Away mode status
- `singleSetpointMode` - Whether single setpoint mode is active
- `zones` - Array of zones
- `setManualAwayMode(enabled)` - Enable/disable away mode

### LennoxZone

Represents a thermostat zone.

- `temperature` - Current temperature
- `humidity` - Current humidity
- `sp` / `spC` - Single setpoint (F/C)
- `hsp` / `hspC` - Heating setpoint (F/C)
- `csp` / `cspC` - Cooling setpoint (F/C)
- `systemMode` - Current HVAC mode
- `setHvacMode(mode)` - Set HVAC mode ('off', 'heat', 'cool', 'heat and cool')
- `setCoolSetpoint(temp)` - Set cooling setpoint
- `setHeatSetpoint(temp)` - Set heating setpoint
- `setSingleSetpoint(temp)` - Set single setpoint (when in SSP mode)
- `setFanMode(mode)` - Set fan mode ('auto', 'on', 'circulate')

## Credits

This library is a TypeScript port of the excellent [lennoxs30api](https://github.com/PeteRager/lennoxs30api) Python library by Pete Rager. The original Python library powers the [Lennox S30 Home Assistant integration](https://github.com/PeteRager/lennoxs30).

## License

MIT
