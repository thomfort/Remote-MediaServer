"use strict";

var Settings = require("../Settings");

class Debug
{
    static debug(...message)
    {
        Debug.log(Debug.LEVEL.DEBUG, message);
    }

    static info(...message)
    {
        Debug.log(Debug.LEVEL.INFO, message);
    }

    static warning(...message)
    {
        Debug.log(Debug.LEVEL.WARNING, message);
    }

    static exception(...message)
    {
        Debug.log(Debug.LEVEL.EXCEPTION, message);
    }

    static log(level, message)
    {
        if(level>=Settings.getValue("verbosity")) {
            switch(level)
            {
                case Debug.LEVEL.INFO:
                case Debug.LEVEL.DEBUG:
                    console.log(message);
                    break;
                case Debug.LEVEL.WARNING:
                    console.warn(message);
                    break;
                case Debug.LEVEL.EXCEPTION:
                    console.error(message);
                    break;
            }
        }
    }
}

Debug.LEVEL = {DEBUG:0, INFO:1, WARNING:3, EXCEPTION:4};

module.exports = Debug;