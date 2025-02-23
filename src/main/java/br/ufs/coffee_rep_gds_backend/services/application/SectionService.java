package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateSectionDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateSectionResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.SectionDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.UserDomainService;
import br.ufs.coffee_rep_gds_backend.specifications.SectionSpecification;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class SectionService {

    private final SectionRepository sectionRepository;
    private final SectionDomainService sectionDomainService;
    private final UserDomainService userDomainService;

    public SectionService(SectionRepository sectionRepository, SectionDomainService sectionDomainService, UserDomainService userDomainService) {
        this.sectionRepository = sectionRepository;
        this.sectionDomainService = sectionDomainService;
        this.userDomainService = userDomainService;
    }

    public Page<SectionResponseDto> findAllActive(String name, Pageable pageable) {
        Specification<Section> spec = SectionSpecification.filter(name);
        Page<Section> allByStatus = sectionRepository.findAllByStatus(Status.ACTIVE.value, spec, pageable);

        var all = allByStatus.stream().map(section -> new SectionResponseDto(
                section.getId(),
                section.getName(),
                section.getObservations())
        ).toList();
        return new PageImpl<>(all, pageable, allByStatus.getTotalElements());
    }

    @Transactional
    public CreateSectionResponseDTO create(CreateSectionDTO dto) {
        Optional<Section> sectionOptional = sectionDomainService.findByName(dto.nome());
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        if (sectionOptional.isPresent()) {
            Section section = sectionOptional.get();
            if (section.getStatus().equals(Status.ACTIVE.value)) {
                section.setStatus(Status.ACTIVE.value);
                section.setUpdatedAt(LocalDateTime.now());
                section = sectionRepository.save(section);
            }
            return new CreateSectionResponseDTO(
                    section.getId(),
                    section.getName(),
                    section.getObservations()
            );
        }

        Section section = new Section(
                dto.nome(),
                dto.observacao(),
                Status.ACTIVE.value,
                user
        );
        Section savedSection = sectionRepository.save(section);

        return new CreateSectionResponseDTO(
                section.getId(),
                savedSection.getName(),
                savedSection.getObservations()
        );
    }

    @Transactional
    public CreateSectionResponseDTO update(Long id, CreateSectionDTO dto) {
        Optional<Section> sectionOptional = sectionRepository.findByIdAndStatus(id, Status.ACTIVE.value);
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        if (sectionOptional.isEmpty()) throw new EntityNotFoundException("Setor não encontrado!");

        Section sectionToSave = sectionOptional.get();
        if (dto.nome() != null && !dto.nome().trim().isEmpty()) sectionToSave.setName(dto.nome());
        if (dto.observacao() != null) sectionToSave.setObservations(dto.observacao());
        sectionToSave.setUpdatedAt(LocalDateTime.now());
        sectionToSave.setUpdatedBy(user);

        Section savedSection = sectionRepository.save(sectionToSave);

        return new CreateSectionResponseDTO(
                savedSection.getId(),
                savedSection.getName(),
                savedSection.getObservations()
        );
    }

    public void delete(Long id) {
        Optional<Section> sectionOptional = sectionRepository.findByIdAndStatus(id, Status.ACTIVE.value);

        if (sectionOptional.isEmpty()) throw new EntityNotFoundException("Setor não encontrado!");

        Section section = sectionOptional.get();
        section.setStatus(Status.INACTIVE.value);
        section.getRooms().forEach(room -> {
            room.setStatus(Status.INACTIVE.value);
        });

        sectionRepository.save(section);
    }
}
