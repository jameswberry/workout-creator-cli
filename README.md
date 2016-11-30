# workout-creator-cli
A command line tool for ZWO Workout Creation and Management

Convert CSV data into Zwift Workout Files.

# CSV Format
The following "columns" are required in the input CSV.

- **Phase**
  - The top level grouping for individual workouts. (e.g. Aerobic Base, Base, Hills, etc.)
- **Class**
  - The incremental class number within the phase (e.g. 1, 2, 3, 4)
- **Type**
  - The type of block in the class. (e.g. Author, SteadyState, etc.)
  - See: _Workout Details_ and _WorkoutBlock Support_ for Type value definitions
- **Value**
  - A value or message associated with the Phase:Class:Type block.
- **Offset**
  - Time offset for blocks of type TEXTEVENT. (Seconds)
- **Repeat**
  - Number of times to repeat the block.
- **Duration**
  - Total duration of the main block. (Seconds)
- **DurationOff**
  - Total duration of the off block. (Seconds)
- **Power**
  - Power target for the block. (% of FTP)
- **PowerLow**
  - Low power target for the block. (% of FTP)
- **PowerHigh**
  - High power target for the block. (% of FTP)
- **PowerOff**
  - Power target for the off block. (% of FTP)
- **Cadence**
  - Cadence target for the block.
- **CadenceLow**
  - Low cadence target for the block.
- **CadenceHigh**
  - High cadence target for the block.
- **CadenceOff**
  - Cadence target for the off block.

# Workout Details
Each *Class* in each *Phase* is required to have the following block **Types** defined.

- **Author**
- **Name**
- **Description**
- **Sport**

Optionally, you may **Tag** your _Class_ with multiple values.

- **Tag**
  - Zwift Defaults: RECOVERY, INTERVALS, FTP, TT.

Note: A tag will automatically be added to the _Class_ for the **Phase** value.  This allows you to search groups of classes by _Phase_ in Zwift.

# Workout Block Support
Supports all of the default ZWO blocks, as well as improved workout block options.

## Default Blocks

Warmup
Ramp
Steady State
IntervalsT
Freeride

# Custom Blocks

ProgressiveWarmup
ProgressiveBuild
SteadyBuild
Progression
Rest
ActiveRest
AlternatingClimb
Climbing
SeatedRoller
StandingRolloer
PaceLine
Colldown
BigDaddies

# Text Events
