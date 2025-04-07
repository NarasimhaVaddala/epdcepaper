package com.epdcepaper.epdcepaper.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;


@RestController
public class MyRestController {
    

    @GetMapping("path")
    public String getPaperbyDate() {

        
        return new String();
    }
    
}
