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
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
class RequesterServiceTest {

    @Mock
    private RequesterRepository requesterRepository;

    @Mock
    private UserDomainService userDomainService;

    @InjectMocks
    private RequesterService requesterService;

    @Test
    void shouldReturnPagedRequesters() {
        User user = new User();
        Requester requester = new Requester("Nome", "999999999", 1, user, "Médico");
        Page<Requester> page = new PageImpl<Requester>(new ArrayList<Requester>(){{add(requester);}});

        Pageable pageable = Pageable.unpaged();

        Mockito.when(requesterRepository.findAllByStatus(
                Mockito.eq(1),
                Mockito.any(),
                Mockito.eq(pageable)
        )).thenReturn(page);

        Page<RequesterResponseDto> response = requesterService.getAllRequesters("Nome", pageable);

        Assertions.assertEquals(1, response.getTotalElements());
    }

    @Test
    void shouldReturnUnpagedRequesters() {
        User user = new User();
        Requester requester = new Requester("Nome", "999999999", 1, user, "Médico");
        List<Requester> requesters = new ArrayList<>(){{add(requester);}};

        Mockito.when(requesterRepository.findAllByStatusUnpaged(Mockito.eq(1), Mockito.any())).thenReturn(requesters);

        List<RequesterResponseDto> response = requesterService.getAllRequesters("Nome");

        Assertions.assertEquals(1, response.size());
    }

    @Test
    void shouldReturnARequester() {
        User user = new User();
        Requester requester = new Requester("Nome", "999999999", 1, user, "Médico");

        Optional<Requester> optionalRequester = Optional.of(requester);

        Mockito.when(requesterRepository.findById(1L)).thenReturn(optionalRequester);

        RequesterResponseDetailDto responseDetailDto = requesterService.getRequesterById(1L);

        Assertions.assertEquals("Nome", responseDetailDto.nome());
    }

    @Test
    void shouldReturnExceptionWhenRequesterNotFound() {
        Long id = 999L;
        Mockito.when(requesterRepository.findById(id)).thenReturn(Optional.empty());

        EntityNotFoundException exception = Assertions.assertThrows(
                EntityNotFoundException.class,
                () -> requesterService.getRequesterById(id)
        );

        Assertions.assertEquals("Solicitante não encontrado", exception.getMessage());
    }

    @Test
    void shouldReturnRequesterWhenSearchByRequesterTypeId() {
        User user = new User();
        Requester requester = new Requester("Nome", "999999999", 1, user, "Médico");
        Page<Requester> page = new PageImpl<Requester>(new ArrayList<Requester>(){{add(requester);}});

        Pageable pageable = Pageable.unpaged();

        Mockito.when(requesterRepository.findAllByRequesterTypeId(
                Mockito.eq(1L),
                Mockito.any(),
                Mockito.eq(pageable)
        )).thenReturn(page);

        Page<RequesterResponseDto> response = requesterService.getRequestersByRequesterTypeId(1L, "Nome", pageable);

        Assertions.assertEquals(1, response.getTotalElements());
    }

    @Test
    void shouldCreateARequester() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            User user = new User();
            user.setUserId(1L);
            user.setName("User");
            user.setStatus(1);

            Requester requester = new Requester();
            requester.setId(1L);
            requester.setName("Requester");
            requester.setContactNumber("9999999999");
            requester.setSpecialty("Médico");
            requester.setStatus(1);

            CreateRequesterDTO dto = new CreateRequesterDTO("Requester", "9999999999", "Médico");

            Mockito.when(userDomainService.findByID(1L)).thenReturn(user);
            Mockito.when(requesterRepository.save(Mockito.any(Requester.class))).thenReturn(requester);

            CreateRequesterResponseDTO createRequesterResponseDTO = requesterService.create(dto);

            Assertions.assertEquals(1L, createRequesterResponseDTO.id());
            Assertions.assertEquals("Requester", createRequesterResponseDTO.nome());
            Assertions.assertEquals("9999999999", createRequesterResponseDTO.telefone());
            Assertions.assertEquals("Médico", createRequesterResponseDTO.especialidade());
        }
    }

    @Test
    void shouldCreateARequesterWithoutPhone() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            User user = new User();
            user.setUserId(1L);

            Requester requester = new Requester();
            requester.setId(1L);
            requester.setName("Requester");
            requester.setContactNumber(null);
            requester.setSpecialty("Médico");
            requester.setStatus(1);

            CreateRequesterDTO dto = new CreateRequesterDTO("Requester", null, "Médico");

            Mockito.when(userDomainService.findByID(1L)).thenReturn(user);
            Mockito.when(requesterRepository.save(Mockito.any(Requester.class))).thenReturn(requester);

            CreateRequesterResponseDTO createRequesterResponseDTO = requesterService.create(dto);

            Assertions.assertNull(createRequesterResponseDTO.telefone());
        }
    }

    @Test
    void shouldUpdateARequester() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            User user = new User();
            user.setUserId(1L);
            user.setName("User");
            user.setStatus(1);

            Requester requester = new Requester();
            requester.setId(1L);
            requester.setName("Requester");
            requester.setContactNumber("9999999999");
            requester.setSpecialty("Médico");
            requester.setStatus(1);

            UpdateRequesterDTO dto = new UpdateRequesterDTO("Requester", "9999999999", "Médico");

            Mockito.when(requesterRepository.findById(1L)).thenReturn(Optional.of(requester));
            Mockito.when(requesterRepository.save(Mockito.any(Requester.class))).thenReturn(requester);

            CreateRequesterResponseDTO createRequesterResponseDTO = requesterService.update(1L, dto);

            Assertions.assertEquals(1L, createRequesterResponseDTO.id());
            Assertions.assertEquals("Requester", createRequesterResponseDTO.nome());
            Assertions.assertEquals("9999999999", createRequesterResponseDTO.telefone());
            Assertions.assertEquals("Médico", createRequesterResponseDTO.especialidade());
        }

    }

    @Test
    void shouldReturnRequesterNotFoundWhenUpdate() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            UpdateRequesterDTO dto = new UpdateRequesterDTO("Requester", "9999999999", "Médico");

            Mockito.when(requesterRepository.findById(1L)).thenReturn(Optional.empty());

            EntityNotFoundException exception = Assertions.assertThrows(
                    EntityNotFoundException.class,
                    () -> requesterService.update(1L, dto)
            );

            Assertions.assertEquals("Solicitante não encontrado!", exception.getMessage());
        }
    }

    @Test
    void shouldInactivateRequesterWhenExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            Long id = 1L;

            User user = new User();
            user.setUserId(1L);

            Requester requester = new Requester();
            requester.setId(id);
            requester.setStatus(Status.ACTIVE.value);

            Mockito.when(requesterRepository.findById(id)).thenReturn(Optional.of(requester));
            Mockito.when(userDomainService.findByID(1L)).thenReturn(user);

            requesterService.delete(id);
            
            Assertions.assertEquals(Status.INACTIVE.value, requester.getStatus());
            Assertions.assertEquals(user, requester.getUpdatedBy());
            Assertions.assertNotNull(requester.getUpdatedAt());

            Mockito.verify(requesterRepository).save(requester);
        }
    }

    @Test
    void shouldReturnRequesterNotFoundWhenDelete() {

        Mockito.when(requesterRepository.findById(1L)).thenReturn(Optional.empty());

        EntityNotFoundException exception = Assertions.assertThrows(
                EntityNotFoundException.class,
                () -> requesterService.delete(1L)
        );

        Assertions.assertEquals("Solicitante não encontrado!", exception.getMessage());
    }
}
