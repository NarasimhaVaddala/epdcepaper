package com.epdcepaper.epdcepaper.controller;

import java.util.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.epdcepaper.epdcepaper.entity.Epaper;
import com.epdcepaper.epdcepaper.service.EpaperService;

@RestController
public class MyRestController {

    @Autowired
    private EpaperService epaperService;

    /**
     * API endpoint to get documents by date.
     *
     * @param date The date to filter the documents (format: yyyy-MM-dd).
     * @return A list of Epaper objects matching the given date.
     */
    @GetMapping("/getbydate")
    public List<Epaper> getPaperByDate(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date date) {

        // Call the service method to fetch editions by date
        return epaperService.getEditionsByDate(date);
    }
}