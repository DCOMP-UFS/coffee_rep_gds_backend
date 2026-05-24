package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.request.UpdateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRequesterResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDetailDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.UserDomainService;
import br.ufs.coffee_rep_gds_backend.specifications.RequesterSpecification;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class RequesterService {

    private final RequesterRepository requesterRepository;
    private final UserDomainService userDomainService;

    public RequesterService(RequesterRepository requesterRepository, UserDomainService userDomainService) {
        this.requesterRepository = requesterRepository;
        this.userDomainService = userDomainService;
    }

    public Page<RequesterResponseDto> getAllRequesters(String name, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name);
        Page<Requester> requesterPage = requesterRepository.findAllByStatus(Status.ACTIVE.value, specification, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getId(),
                req.getName(),
                req.getContactNumber(),
                req.getSpecialty()
        )).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }

    public List<RequesterResponseDto> getAllRequesters(String name) {
        Specification<Requester> specification = RequesterSpecification.all(name);
        List<Requester> requesters = requesterRepository.findAllByStatusUnpaged(Status.ACTIVE.value, specification);

        return requesters.stream().map(req -> new RequesterResponseDto(
                req.getId(),
                req.getName(),
                req.getContactNumber(),
                req.getSpecialty())).toList();
    }

    public RequesterResponseDetailDto getRequesterById(Long id) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado");

        Requester requester = optional.get();
        return new RequesterResponseDetailDto(
                requester.getId(),
                requester.getName(),
                requester.getContactNumber(),
                requester.getSpecialty()
        );
    }

    public Page<RequesterResponseDto> getRequestersByRequesterTypeId(Long requesterTypeId, String name, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name);
        Page<Requester> requesterPage = requesterRepository.findAllByRequesterTypeId(requesterTypeId, specification, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getId(),
                req.getName(),
                req.getContactNumber(),
                req.getSpecialty())).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }

    public CreateRequesterResponseDTO create(CreateRequesterDTO dto) {
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        Requester requester = new Requester(
                dto.nome(),
                normalizePhone(dto.telefone()),
                Status.ACTIVE.value,
                user,
                dto.especialidade()
        );
        Requester saved = requesterRepository.save(requester);
        return new CreateRequesterResponseDTO(
                saved.getId(),
                saved.getName(),
                saved.getContactNumber(),
                saved.getSpecialty()
        );
    }

    public CreateRequesterResponseDTO update(Long id, UpdateRequesterDTO dto) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado!");

        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        Requester requester = optional.get();

        if (dto.nome() != null && !dto.nome().trim().isEmpty()) requester.setName(dto.nome());
        requester.setContactNumber(normalizePhone(dto.telefone()));
        if (dto.especialidade() != null && !dto.especialidade().trim().isEmpty()) requester.setSpecialty(dto.especialidade());
        requester.setUpdatedAt(LocalDateTime.now());
        requester.setUpdatedBy(user);

        Requester saved = requesterRepository.save(requester);
        return new CreateRequesterResponseDTO(
                saved.getId(),
                saved.getName(),
                saved.getContactNumber(),
                saved.getSpecialty()
        );
    }

    public void delete(Long id) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado!");

        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());
        Requester requester = optional.get();

        requester.setStatus(Status.INACTIVE.value);
        requester.setUpdatedBy(user);
        requester.setUpdatedAt(LocalDateTime.now());

        requesterRepository.save(requester);
    }

    private static String normalizePhone(String telefone) {
        if (telefone == null || telefone.trim().isEmpty()) {
            return null;
        }
        return telefone;
    }
}
