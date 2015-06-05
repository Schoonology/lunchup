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
lunchup CSV SIZE
```

Lunchup takes in a CSV of names to Cohorts, emitting a new CSV of groups to
names. With no Cohort data, this list is simply randomized.

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
> lunchup in.csv 3
Dave, Larry, Fred
Schoon, Jim, Stephen
```
