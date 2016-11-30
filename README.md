# workout-creator-cli
A command line tool for ZWO Workout Creation and Management

Convert CSV data into Zwift Workout Files.

# Usage

```cli
> git clone https://github.com/jameswberry/workout-creator-cli.git

> cd workout-creator-cli

Interactive mode
> node WorkoutCreator
Input [.csv] > (WorkoutCreator.csv) 
Output Directory > (./) 
Template [.mustache] > (WorkoutCreator.mustache) 
Verbose > (true) 
Debug > (false) 

CLI Args
> node WorkoutCreator --input WorkoutCreator.csv --output ./ --template WorkoutCreator.mustache -- verbose true --debug true
```

# CSV Format
The following "columns" are required in the input CSV.

- **Phase**
  - The top level grouping for individual workouts. (e.g. Aerobic Base, Base, Hills, etc.)
- **Class**
  - The incremental class number within the phase (e.g. 1, 2, 3, 4)
- **Type**
  - The type of block in the class. (e.g. Author, SteadyState, etc.)
  - See: _Workout Block Types_ for **Type** value definitions
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

# Workout Block Types

## Workout Details
Each *Class* in each *Phase* is required to have the following block **Types** defined.

- **Author**
- **Name**
- **Description**
- **Sport**
- **Tag** (Multiple, Optional)
  - Zwift Defaults: RECOVERY, INTERVALS, FTP, TT.
	- _**Note**_: A tag will automatically be added to the _Class_ for the **Phase** value (e.g. Base, Hills, etc.).  This allows you to search groups of workout classes by _Phase_ in Zwift.

## Workout Blocks
Supports all of the default ZWO blocks, as well as custom workout block options.

### Default Blocks

- **Warmup**
- **Ramp**
- **Steady State**
- **IntervalsT**
- **Freeride**

### Custom Blocks

- **ProgressiveWarmup**
- **ProgressiveBuild**
- **SteadyBuild**
- **Progression**
- **Rest**
- **ActiveRest**
- **AlternatingClimb**
- **Climbing**
- **SeatedRoller**
- **StandingRolloer**
- **PaceLine**
- **Cooldown**
- **BigDaddies**

## TextEvent
Text events are displayed on the Zwift screen, triggered at the beginning of each workout block.  They can be added in two ways:

1. _**Value**_ 
	- Associating a _Value_ with a _Phase:Class:Type_ workout block in the CSV will automatically add a **TextEvent** at time 0 with that value.
1. _**Type**_
	- Adding a **TextEvent** block will automatically apply the **TextEvent* to the previous non-textevent block at time _Offset_.

**TextEvents** are displayed in Zwift for 10 seconds, so it's recommended that _Offset_ values are in multiples of 5 or 10.

Also note that many Custom Blocks add predefined **TextEvents**, so you will want to confirm that your _Offset_ values take these into consideration.
