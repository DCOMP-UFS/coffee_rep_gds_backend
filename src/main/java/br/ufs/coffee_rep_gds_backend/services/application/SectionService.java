package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateSectionDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateSectionResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
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
import java.util.List;
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

    public List<SectionResponseDto> findAllActive(String name) {
        Specification<Section> spec = SectionSpecification.filter(name);
        List<Section> allByStatus = sectionRepository.findAllByStatusUnpaged(Status.ACTIVE.value, spec);

        return allByStatus.stream().map(section -> new SectionResponseDto(
                section.getId(),
                section.getName(),
                section.getObservations())
        ).toList();
    }

    @Transactional
    public CreateSectionResponseDTO create(CreateSectionDTO dto) {
        Optional<Section> sectionOptional = sectionDomainService.findByName(dto.nome());
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        if (sectionOptional.isPresent()) {
            Section section = sectionOptional.get();
            if (section.getStatus().equals(Status.INACTIVE.value)) {
                section.setStatus(Status.ACTIVE.value);
                section.setUpdatedAt(LocalDateTime.now());
                section.setUpdatedBy(user);
                section = sectionRepository.save(section);
            } else throw new EntityAlreadyExistsException("Já existe um setor com esse nome!");
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

        Optional<Section> optionalNameSearch = sectionDomainService.findByName(dto.nome());
        if (optionalNameSearch.isPresent()) {
            Section nameSearchedSection = optionalNameSearch.get();
            if (nameSearchedSection.getStatus().equals(Status.ACTIVE.value)) throw new EntityAlreadyExistsException("Já existe um setor com esse nome!");
            else {
                nameSearchedSection.setStatus(Status.ACTIVE.value);
                nameSearchedSection.setUpdatedAt(LocalDateTime.now());
                nameSearchedSection.setUpdatedBy(user);
                Section saved = sectionRepository.save(nameSearchedSection);

                return new CreateSectionResponseDTO(
                        saved.getId(),
                        saved.getName(),
                        saved.getObservations()
                );
            }
        }

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

    @Transactional
    public void delete(Long id) {
        Optional<Section> sectionOptional = sectionRepository.findByIdAndStatus(id, Status.ACTIVE.value);
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        if (sectionOptional.isEmpty()) throw new EntityNotFoundException("Setor não encontrado!");

        Section section = sectionOptional.get();
        section.setStatus(Status.INACTIVE.value);
        section.setUpdatedAt(LocalDateTime.now());
        section.setUpdatedBy(user);
        section.getRooms().forEach(room -> {
            room.setStatus(Status.INACTIVE.value);
            room.setUpdatedBy(user);
            room.setUpdatedAt(LocalDateTime.now());
        });

        sectionRepository.save(section);
    }
}
