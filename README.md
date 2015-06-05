# Lunchup

Lunchup is a tool to randomly generate lunchtime meetup groups withing a larger
organization. Lunchup takes into account any number of "cohort" groups,
weighting its output to mix up those cohorts as much as possible.

## Installation

```
npm install -g lunchup
```

## Usage

```
lunchup SIZE CSV
```

Lunchup takes all input CSVs (including STDIN) of names to Cohorts, emitting a
new CSV of names to groups. With no Cohort data, this list is simply randomized.

For example, given the input:

```
Schoon, 200
Dave, 200
Jim, 100
Larry, 400
Fred, 300
Stephen, 300
```

You might see the following:

```
> lunchup 3 in.csv
Dave,0
Larry,0
Fred,0
Schoon,1
Stephen,1
Jim,1
```
