package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterAbsenceDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterAbsenceResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.RequesterAbsence;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.exceptions.BadParametersException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterAbsenceRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.RequesterDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.UserDomainService;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RequesterAbsenceService {

    private final RequesterAbsenceRepository absenceRepository;
    private final RequesterDomainService requesterService;
    private final UserDomainService userService;

    public RequesterAbsenceService(
            RequesterAbsenceRepository absenceRepository,
            RequesterDomainService requesterService,
            UserDomainService userService
    ) {
        this.absenceRepository = absenceRepository;
        this.requesterService = requesterService;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<RequesterAbsenceResponseDto> findAll(Long solicitanteId) {
        if (solicitanteId == null) {
            return absenceRepository.findAll().stream().map(this::toDto).toList();
        }
        return absenceRepository.findAllByRequester_IdOrderByStartDateDesc(solicitanteId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public RequesterAbsenceResponseDto create(CreateRequesterAbsenceDto dto) {
        validateDateRange(dto);
        Requester requester = requesterService.getRequesterById(dto.solicitanteId());
        User user = userService.findByID(CurrentUserUtils.getCurrentUserID());

        RequesterAbsence entity = new RequesterAbsence(requester, dto.dataInicio(), dto.dataFim(), user);
        RequesterAbsence saved = absenceRepository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public RequesterAbsenceResponseDto update(Long id, CreateRequesterAbsenceDto dto) {
        validateDateRange(dto);
        RequesterAbsence entity = absenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Ausência não encontrada: " + id));

        Requester requester = requesterService.getRequesterById(dto.solicitanteId());
        User user = userService.findByID(CurrentUserUtils.getCurrentUserID());

        entity.setRequester(requester);
        entity.setStartDate(dto.dataInicio());
        entity.setEndDate(dto.dataFim());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedBy(user);

        return toDto(absenceRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        if (!absenceRepository.existsById(id)) {
            throw new EntityNotFoundException("Ausência não encontrada: " + id);
        }
        absenceRepository.deleteById(id);
    }

    private void validateDateRange(CreateRequesterAbsenceDto dto) {
        if (dto.dataInicio().isAfter(dto.dataFim())) {
            throw new BadParametersException("A data de início não pode ser posterior à data de fim.");
        }
    }

    private RequesterAbsenceResponseDto toDto(RequesterAbsence e) {
        return new RequesterAbsenceResponseDto(
                e.getId(),
                e.getRequester().getId(),
                e.getRequester().getName(),
                e.getStartDate(),
                e.getEndDate()
        );
    }
}
