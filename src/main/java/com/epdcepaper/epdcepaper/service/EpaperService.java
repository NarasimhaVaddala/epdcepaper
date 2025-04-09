package com.epdcepaper.epdcepaper.service;

import java.util.Date;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.epdcepaper.epdcepaper.entity.Epaper;
import com.epdcepaper.epdcepaper.repository.EpaperRepository;

@Service
public class EpaperService {

    @Autowired
    private EpaperRepository contentRepository;

    public List<Epaper> getAllContent() {
        return contentRepository.findAll();
    }

    public List<Epaper> getEditionsByDate(Date date) {
        return contentRepository.findByDate(date);
    }

    public Epaper getLatestContent() {
        return contentRepository.findFirstByOrderByIdDesc();
    }
}
