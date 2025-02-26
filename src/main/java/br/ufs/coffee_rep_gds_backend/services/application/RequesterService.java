package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.request.UpdateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRequesterResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDetailDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.RequesterType;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.RequesterTypeDomainService;
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
    private final RequesterTypeDomainService requesterTypeDomainService;

    public RequesterService(RequesterRepository requesterRepository, UserDomainService userDomainService, RequesterTypeDomainService requesterTypeDomainService) {
        this.requesterRepository = requesterRepository;
        this.userDomainService = userDomainService;
        this.requesterTypeDomainService = requesterTypeDomainService;
    }

    public Page<RequesterResponseDto> getAllRequesters(String name, String cpf, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name, cpf);
        Page<Requester> requesterPage = requesterRepository.findAllByStatus(Status.ACTIVE.value, specification, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getId(),
                req.getName(),
                req.getRequesterType().getName(),
                req.getRequesterType().getPosition())).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }

    public List<RequesterResponseDto> getAllRequesters(String name, String cpf) {
        Specification<Requester> specification = RequesterSpecification.all(name, cpf);
        List<Requester> requesters = requesterRepository.findAllByStatusUnpaged(Status.ACTIVE.value, specification);

        return requesters.stream().map(req -> new RequesterResponseDto(
                req.getId(),
                req.getName(),
                req.getRequesterType().getName(),
                req.getRequesterType().getPosition())).toList();
    }

    public RequesterResponseDetailDto getRequesterById(Long id) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado");

        Requester requester = optional.get();
        return new RequesterResponseDetailDto(
                requester.getId(),
                requester.getName(),
                requester.getCpf(),
                requester.getContactNumber(),
                requester.getRequesterType().getName(),
                requester.getRequesterType().getPosition()
        );
    }

    public Page<RequesterResponseDto> getRequestersByRequesterTypeId(Long requesterTypeId, String name, String cpf, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name, cpf);
        Page<Requester> requesterPage = requesterRepository.findAllByRequesterTypeId(requesterTypeId, specification, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getId(),
                req.getName(),
                req.getRequesterType().getName(),
                req.getRequesterType().getPosition())).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }

    public CreateRequesterResponseDTO create(CreateRequesterDTO dto) {
        Optional<Requester> optional = requesterRepository.findByCpf(dto.cpf());
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        if (optional.isPresent()) {
            Requester requester = optional.get();
            if (requester.getStatus().equals(Status.INACTIVE.value)) {
                requester.setStatus(Status.ACTIVE.value);
                requester.setUpdatedAt(LocalDateTime.now());
                requester.setUpdatedBy(user);
                requesterRepository.save(requester);
            }
            throw new EntityAlreadyExistsException("CPF já cadastrado!");
        }

        RequesterType requesterType = requesterTypeDomainService.createRequesterType(dto.tipo(), dto.cargo());
        Requester requester = new Requester(dto.nome(), dto.cpf(), dto.telefone(), Status.ACTIVE.value, user, requesterType);
        Requester saved = requesterRepository.save(requester);
        return new CreateRequesterResponseDTO(
                saved.getName(),
                saved.getCpf(),
                saved.getContactNumber(),
                saved.getRequesterType().getName(),
                saved.getRequesterType().getPosition()
        );
    }

    public CreateRequesterResponseDTO update(Long id, UpdateRequesterDTO dto) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado!");

        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        Requester requester = optional.get();
        RequesterType requesterType = requester.getRequesterType();
        if (dto.tipo() != null && dto.cargo() != null) {
            requesterType = requesterTypeDomainService.createRequesterType(dto.tipo(), dto.cargo());
        }

        if (dto.nome() != null) requester.setName(dto.nome());
        requester.setContactNumber(dto.telefone());
        requester.setRequesterType(requesterType);
        requester.setUpdatedAt(LocalDateTime.now());
        requester.setUpdatedBy(user);

        Requester saved = requesterRepository.save(requester);
        return new CreateRequesterResponseDTO(
                saved.getName(),
                saved.getCpf(),
                saved.getContactNumber(),
                saved.getRequesterType().getName(),
                saved.getRequesterType().getPosition()
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
}
