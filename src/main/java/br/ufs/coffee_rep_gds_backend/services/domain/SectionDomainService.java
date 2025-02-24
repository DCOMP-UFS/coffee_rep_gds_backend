package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class SectionDomainService {

    private final SectionRepository sectionRepository;

    public SectionDomainService(SectionRepository sectionRepository) {
        this.sectionRepository = sectionRepository;
    }

    public Optional<Section> findByName(String name) {
        return sectionRepository.findByNameIgnoreCase(name);
    }

    public Section findById(Long id) {
        Optional<Section> optional = sectionRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Setor não encontrado");

        return optional.get();
    }

    public Section findByIdAndStatus(Long id, Integer status) {
        Optional<Section> optional = sectionRepository.findByIdAndStatus(id, status);

        if (optional.isEmpty()) throw new EntityNotFoundException("Setor não encontrado");

        return optional.get();
    }
}
