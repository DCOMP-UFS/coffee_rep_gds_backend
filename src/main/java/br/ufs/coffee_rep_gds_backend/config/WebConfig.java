package br.ufs.coffee_rep_gds_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.hateoas.config.EnableHypermediaSupport;
import org.springframework.hateoas.support.WebStack;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
@EnableHypermediaSupport(type = EnableHypermediaSupport.HypermediaType.HAL, stacks = WebStack.WEBMVC)
public class WebConfig {
}
