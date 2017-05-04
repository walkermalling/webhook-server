#!/bin/bash

# assume that
#  - the 1st argument is the path to the repo
#  - the 2nd argument is the name of the branch to pull
# this should be set in the configuration of the webhook service

cd $1
git pull origin $2
